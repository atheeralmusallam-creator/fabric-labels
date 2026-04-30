import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// ── Color palette ─────────────────────────────────────────────────────────
const P = {
  navy:    "1B3A5C", teal:    "0D7377",
  green:   "27AE60", red:     "E74C3C",
  amber:   "E67E22", purple:  "7D3C98",
  hdr_fg:  "FFFFFF", row_a:   "F0F4F8",
  row_b:   "FFFFFF", agree:   "D5F5E3",
  dis:     "FADBD8", pend:    "FEF9E7",
  sec:     "D6EAF8",
};

const CHART_COLORS = ["4472C4","ED7D31","A9D18E","FF0000","FFC000","5B9BD5"];

function S(v: any, opts: {
  bold?: boolean; size?: number; color?: string; bg?: string;
  align?: string; wrap?: boolean; italic?: boolean; fmt?: string;
} = {}) {
  const cell: any = { v, t: typeof v === "number" ? "n" : "s" };
  const style: any = {
    font: { name:"Calibri", sz: opts.size??10, bold: opts.bold??false,
            italic: opts.italic??false, color:{ rgb: opts.color??"222222" } },
    alignment: { horizontal: opts.align??"left", vertical:"center", wrapText: opts.wrap??false },
    border: {
      top:    { style:"thin", color:{rgb:"CBD5E0"} },
      bottom: { style:"thin", color:{rgb:"CBD5E0"} },
      left:   { style:"thin", color:{rgb:"CBD5E0"} },
      right:  { style:"thin", color:{rgb:"CBD5E0"} },
    },
  };
  if (opts.bg) style.fill = { fgColor:{rgb: opts.bg}, patternType:"solid" };
  if (opts.fmt) cell.z = opts.fmt;
  cell.s = style;
  return cell;
}

function H(text: string, bg = P.navy) {
  return S(text, { bold:true, size:10, color: P.hdr_fg, bg, align:"center" });
}

function evalBg(e: string) {
  return e==="Safe" ? P.agree : e==="Not Safe" ? P.dis : P.pend;
}

function kappaBg(k: number) {
  return k>=0.8 ? P.agree : k>=0.6 ? "FEF9E7" : k>=0.4 ? "FDEBD0" : P.dis;
}

function cohenKappa(y1: string[], y2: string[], labels: string[]) {
  const n = y1.length;
  const po = y1.filter((v,i)=>v===y2[i]).length / n;
  const pe = labels.reduce((s,l)=> s + (y1.filter(v=>v===l).length/n) * (y2.filter(v=>v===l).length/n), 0);
  return pe===1 ? 1 : Math.round(((po-pe)/(1-pe))*1000)/1000;
}

export async function GET(req: Request, { params }: { params: { projectId: string } }) {

  // filterUserId present → annotator export (only their own rows)
  const url = new URL(req.url);
  const filterUserId = url.searchParams.get("userId") || null;

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      tasks: {
        orderBy: { order:"asc" },
        include: {
          annotations: {
            where: { status:"SUBMITTED" },
            include: { user: { select:{ id:true, name:true, email:true } } },
          },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error:"Not found" }, { status:404 });

  const data = (task: any) => task.data as any;
  const rating = (a: any): string => String((a.result as any)?.rating || (a.result as any)?.evaluation || "");
  const annName = (a: any) => a.user?.name || a.user?.email || "Unknown";

  // ── Flatten to long format ──────────────────────────────────────────────
  type Row = { task_id:string; domain:string; answer:string; prompt:string;
               annotator:string; comments:string; evaluation:string };
  const longRows: Row[]    = [];  // Tasks sheet — filtered by userId if annotator
  const allLongRows: Row[] = [];  // Stats/Agreement — always all annotations

  project.tasks.forEach(task => {
    const d = data(task);
    const tid   = String(d.id || d.task_id || d.external_id || task.id).slice(0,50);
    const domain= String(d.risk_category||d.domain||d.category||"");
    const ans   = String(d.answer||d.ai_answer||d.response||d.output||"").slice(0,400);
    const pmt   = String(d.prompt||d.question||d.text||"").slice(0,400);
    task.annotations.forEach(ann => {
      const row = { task_id:tid, domain, answer:ans, prompt:pmt,
                    annotator: annName(ann),
                    comments:  ann.notes||"",
                    evaluation: rating(ann) };
      allLongRows.push(row);
      // Tasks sheet: only current user's rows if annotator export
      if (!filterUserId || ann.userId === filterUserId) longRows.push(row);
    });
  });

  // ── Per-task agreement ─────────────────────────────────────────────────
  const taskMap = new Map<string,string[]>();
  const taskMeta = new Map<string,{domain:string;answer:string;prompt:string}>();
  allLongRows.forEach(r => {
    if (!taskMap.has(r.task_id)) taskMap.set(r.task_id,[]);
    taskMap.get(r.task_id)!.push(r.evaluation);
    if (!taskMeta.has(r.task_id)) taskMeta.set(r.task_id,{domain:r.domain,answer:r.answer,prompt:r.prompt});
  });

  const agreeRows = Array.from(taskMap.entries()).map(([tid, evals]) => {
    const nonEmpty = evals.filter(Boolean);
    let agg = "Pending";
    if (nonEmpty.length > 0) {
      agg = new Set(nonEmpty).size===1 ? nonEmpty[0] : "disagreement";
    }
    const meta = taskMeta.get(tid)!;
    return { task_id:tid, domain:meta.domain, answer:meta.answer, prompt:meta.prompt, evaluation_agreement:agg };
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  const total = agreeRows.length;
  const statsCounts: Record<string,number> = {};
  agreeRows.forEach(r => { statsCounts[r.evaluation_agreement] = (statsCounts[r.evaluation_agreement]||0)+1; });
  const statsRows = Object.entries(statsCounts).sort().map(([k,v])=>({label:k,count:v,pct:v/total}));

  // ── Kappa pairs ────────────────────────────────────────────────────────
  const annotators = Array.from(new Set(allLongRows.map(r=>r.annotator))).sort();
  const kappaRows: {a1:string;a2:string;shared:number;kappa:number}[] = [];
  for (let i=0;i<annotators.length;i++) for (let j=i+1;j<annotators.length;j++) {
    const a1=annotators[i], a2=annotators[j];
    const d1 = new Map(allLongRows.filter(r=>r.annotator===a1).map(r=>[r.task_id,r.evaluation]));
    const d2 = new Map(allLongRows.filter(r=>r.annotator===a2).map(r=>[r.task_id,r.evaluation]));
    const shared = Array.from(d1.keys()).filter(k=>d2.has(k));
    if (shared.length<2) continue;
    const y1=shared.map(k=>d1.get(k)!), y2=shared.map(k=>d2.get(k)!);
    const labels=Array.from(new Set([...y1,...y2]));
    kappaRows.push({ a1, a2, shared:shared.length, kappa:cohenKappa(y1,y2,labels) });
  }
  const avgKappa = kappaRows.length ? Math.round(kappaRows.reduce((s,r)=>s+r.kappa,0)/kappaRows.length*1000)/1000 : 0;

  const wb = XLSX.utils.book_new();

  // ══════════════════════════════════════════════════════════════════════
  // SHEET 1 — Tasks (long format)
  // ══════════════════════════════════════════════════════════════════════
  const ws1: any = {};
  const h1 = ["task_id","domain","data_answer","data_prompt","Annotator","comments","evaluation"];
  const w1 = [12,12,50,50,28,30,12];
  h1.forEach((h,i) => { ws1[XLSX.utils.encode_cell({r:0,c:i})] = H(h, P.navy); });
  longRows.forEach((row,ri) => {
    const r=ri+1, bg=evalBg(row.evaluation);
    const vals=[row.task_id,row.domain,row.answer,row.prompt,row.annotator,row.comments,row.evaluation];
    vals.forEach((v,ci) => {
      const cell = S(v,{bg, wrap:(ci===2||ci===3||ci===5)});
      if (ci===6) { const col=row.evaluation==="Safe"?P.green:row.evaluation==="Not Safe"?P.red:P.amber;
                    cell.s.font.color={rgb:col}; cell.s.font.bold=true; }
      ws1[XLSX.utils.encode_cell({r,c:ci})] = cell;
    });
  });
  ws1["!ref"]  = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:longRows.length,c:6}});
  ws1["!cols"] = w1.map(w=>({wch:w}));
  ws1["!rows"] = [{hpx:26}];
  ws1["!freeze"] = {xSplit:0,ySplit:1};
  XLSX.utils.book_append_sheet(wb, ws1, "Tasks");

  // ══════════════════════════════════════════════════════════════════════
  // SHEET 2 — Agreement (wide, one row per task)
  // ══════════════════════════════════════════════════════════════════════
  const ws2: any = {};
  const h2 = ["task_id","domain","answer","prompt","evaluation_agreement"];
  const w2 = [12,12,50,50,22];
  h2.forEach((h,i) => { ws2[XLSX.utils.encode_cell({r:0,c:i})] = H(h, P.teal); });
  agreeRows.forEach((row,ri) => {
    const r=ri+1, bg=evalBg(row.evaluation_agreement);
    const vals=[row.task_id,row.domain,row.answer,row.prompt,row.evaluation_agreement];
    vals.forEach((v,ci) => {
      const cell = S(v,{bg,wrap:(ci===2||ci===3)});
      if (ci===4) { const col=row.evaluation_agreement==="Safe"?P.green:row.evaluation_agreement==="Not Safe"?P.red:P.amber;
                    cell.s.font.color={rgb:col}; cell.s.font.bold=true; }
      ws2[XLSX.utils.encode_cell({r,c:ci})] = cell;
    });
  });
  ws2["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:agreeRows.length,c:4}});
  ws2["!cols"]   = w2.map(w=>({wch:w}));
  ws2["!rows"]   = [{hpx:26}];
  ws2["!freeze"] = {xSplit:0,ySplit:1};
  XLSX.utils.book_append_sheet(wb, ws2, "Agreement");

  // ══════════════════════════════════════════════════════════════════════
  // SHEET 3 — Agreement Stats
  // ══════════════════════════════════════════════════════════════════════
  const ws3: any = {};
  const m3: any[] = [];
  ws3[XLSX.utils.encode_cell({r:0,c:0})] = S("Agreement Statistics",{bold:true,size:12,color:P.navy,bg:P.sec});
  m3.push({s:{r:0,c:0},e:{r:0,c:2}});
  ["evaluation_agreement","count","%"].forEach((h,i)=>{
    ws3[XLSX.utils.encode_cell({r:2,c:i})] = H(h, P.navy);
  });
  const lc: Record<string,string> = {Safe:P.green,"Not Safe":P.red,disagreement:P.amber,Total:P.navy};
  statsRows.forEach((s,ri)=>{
    const r=ri+3, bg=s.label==="Total"?P.sec:(ri%2===0?P.row_a:P.row_b);
    const lbl = ws3[XLSX.utils.encode_cell({r,c:0})] = S(s.label,{bg,bold:s.label==="Total",color:lc[s.label]||"222222"});
    ws3[XLSX.utils.encode_cell({r,c:1})] = S(s.count,{bg,align:"center",bold:s.label==="Total"});
    ws3[XLSX.utils.encode_cell({r,c:2})] = S(s.label==="Total"?"100%":(s.pct*100).toFixed(1)+"%",{bg,align:"center",bold:s.label==="Total"});
  });
  // total row
  const totalR = 3+statsRows.length;
  [S("Total",{bg:P.sec,bold:true,color:P.navy}), S(total,{bg:P.sec,align:"center",bold:true}), S("100%",{bg:P.sec,align:"center",bold:true})].forEach((c,i)=>{
    ws3[XLSX.utils.encode_cell({r:totalR,c:i})]=c;
  });
  ws3["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:totalR,c:2}});
  ws3["!cols"]   = [{wch:28},{wch:12},{wch:14}];
  ws3["!merges"] = m3;
  XLSX.utils.book_append_sheet(wb, ws3, "Agreement Stats");

  // ══════════════════════════════════════════════════════════════════════
  // SHEET 4 — Agreement Stats by Domain
  // ══════════════════════════════════════════════════════════════════════
  const ws4: any = {};
  const m4: any[] = [];
  ws4[XLSX.utils.encode_cell({r:0,c:0})] = S("Agreement Statistics by Domain",{bold:true,size:12,color:P.navy,bg:P.sec});
  m4.push({s:{r:0,c:0},e:{r:0,c:3}});
  ["domain","evaluation_agreement","count","%"].forEach((h,i)=>{
    ws4[XLSX.utils.encode_cell({r:2,c:i})] = H(h, P.teal);
  });
  // group by domain
  const domainMap: Record<string,Record<string,number>> = {};
  agreeRows.forEach(r=>{
    const d=r.domain||"(none)";
    if (!domainMap[d]) domainMap[d]={};
    domainMap[d][r.evaluation_agreement] = (domainMap[d][r.evaluation_agreement]||0)+1;
  });
  let dr=3;
  Object.entries(domainMap).forEach(([dom,counts])=>{
    const dt=Object.values(counts).reduce((s,v)=>s+v,0);
    Object.entries(counts).sort().forEach(([lbl,cnt])=>{
      const bg=dr%2===0?P.row_a:P.row_b;
      ws4[XLSX.utils.encode_cell({r:dr,c:0})] = S(dom,{bg});
      const lc2=ws4[XLSX.utils.encode_cell({r:dr,c:1})] = S(lbl,{bg,color:lc[lbl]||"222222"});
      ws4[XLSX.utils.encode_cell({r:dr,c:2})] = S(cnt,{bg,align:"center"});
      ws4[XLSX.utils.encode_cell({r:dr,c:3})] = S((cnt/dt*100).toFixed(1)+"%",{bg,align:"center"});
      dr++;
    });
  });
  ws4["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:dr,c:3}});
  ws4["!cols"]   = [{wch:20},{wch:26},{wch:12},{wch:14}];
  ws4["!merges"] = m4;
  XLSX.utils.book_append_sheet(wb, ws4, "Agreement Stats by Domain");

  // ══════════════════════════════════════════════════════════════════════
  // SHEET 5 — Inter-rater Agreement
  // ══════════════════════════════════════════════════════════════════════
  const ws5: any = {};
  const m5: any[] = [];
  ws5[XLSX.utils.encode_cell({r:0,c:0})] = S("Inter-rater Agreement — Cohen's Kappa",{bold:true,size:12,color:P.navy,bg:P.sec});
  m5.push({s:{r:0,c:0},e:{r:0,c:4}});
  ["Annotator 1","Annotator 2","Label Type","Shared Items","Cohen Kappa"].forEach((h,i)=>{
    ws5[XLSX.utils.encode_cell({r:2,c:i})] = H(h, P.purple);
  });
  kappaRows.forEach((kr,ri)=>{
    const r=ri+3, bg=ri%2===0?P.row_a:P.row_b;
    ws5[XLSX.utils.encode_cell({r,c:0})] = S(kr.a1,{bg});
    ws5[XLSX.utils.encode_cell({r,c:1})] = S(kr.a2,{bg});
    ws5[XLSX.utils.encode_cell({r,c:2})] = S("evaluation",{bg,align:"center"});
    ws5[XLSX.utils.encode_cell({r,c:3})] = S(kr.shared,{bg,align:"center"});
    const kbg = kappaBg(kr.kappa);
    const kcol = kr.kappa>=0.8?P.green:kr.kappa>=0.6?P.amber:P.red;
    ws5[XLSX.utils.encode_cell({r,c:4})] = S(kr.kappa,{bg:kbg,align:"center",bold:true,color:kcol});
  });
  const sr2 = 3+kappaRows.length+1;
  ws5[XLSX.utils.encode_cell({r:sr2,c:0})] = S("Label Type",{bold:true,bg:P.sec,color:P.navy});
  ws5[XLSX.utils.encode_cell({r:sr2,c:1})] = S("Number of Pairs",{bold:true,bg:P.sec,color:P.navy});
  ws5[XLSX.utils.encode_cell({r:sr2,c:2})] = S("Average Kappa",{bold:true,bg:P.sec,color:P.navy});
  ws5[XLSX.utils.encode_cell({r:sr2+1,c:0})] = S("evaluation",{align:"center"});
  ws5[XLSX.utils.encode_cell({r:sr2+1,c:1})] = S(kappaRows.length,{align:"center"});
  const akCell = S(avgKappa,{align:"center",bold:true,bg:kappaBg(avgKappa),color:avgKappa>=0.8?P.green:avgKappa>=0.6?P.amber:P.red});
  ws5[XLSX.utils.encode_cell({r:sr2+1,c:2})] = akCell;
  ws5["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:sr2+1,c:4}});
  ws5["!cols"]   = [{wch:30},{wch:30},{wch:14},{wch:14},{wch:14}];
  ws5["!merges"] = m5;
  XLSX.utils.book_append_sheet(wb, ws5, "Inter-rater Agreement");

  // ── File name ──────────────────────────────────────────────────────────
  const safeName = project.name.replace(/[\\/: *?"<>|]/g, "_");
  const fileName = `export_${safeName}.xlsx`;
  const buffer   = XLSX.write(wb, { type:"buffer", bookType:"xlsx", bookSST:false });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
