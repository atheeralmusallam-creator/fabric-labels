// src/app/api/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = body.description ? String(body.description) : null;

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: { name, description },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("POST /api/organizations error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
