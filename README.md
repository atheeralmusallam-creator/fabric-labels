# 🏷️ Annotation Studio

A flexible, open-source data annotation platform supporting multiple annotation types. Built with Next.js, PostgreSQL, and Prisma.

## Features

- **7 Annotation Types**: Text Classification, NER/Span Labeling, Image Classification, Bounding Box, Audio Transcription, Q&A Review, Free-form Notes
- **Flexible Data Model**: `project.config` JSON drives the UI — add labels, hotkeys, colors without code changes
- **Keyboard Shortcuts**: `←` / `→` navigate, `Enter` submits, `Ctrl+Enter` submits from text fields
- **Task Management**: Pending / Submitted / Skipped statuses with progress tracking
- **Project Dashboard**: Overview of all projects with completion stats
- **REST API**: Full CRUD for projects, tasks, and annotations

---

## Tech Stack

| Layer       | Technology            |
|------------|----------------------|
| Framework  | Next.js 14 (App Router) |
| Database   | PostgreSQL            |
| ORM        | Prisma                |
| Styling    | Tailwind CSS          |
| Deploy     | Railway               |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Docker)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/annotation-studio.git
cd annotation-studio
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

Example `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/annotation_studio?schema=public"
```

### 3. Database Setup
```bash
# Push schema to DB
npm run db:push

# Seed with sample data (7 projects, ~25 tasks)
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📦 Docker (local PostgreSQL)

```bash
docker run -d \
  --name annotation-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=annotation_studio \
  -p 5432:5432 \
  postgres:15
```

Then use:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/annotation_studio"
```

---

## 🚢 Deploy to Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/annotation-studio.git
git push -u origin main
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `annotation-studio` repo

### 3. Add PostgreSQL
1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway auto-sets `DATABASE_URL` — nothing to configure

### 4. Configure Build
Railway auto-detects Next.js. The `postinstall` script runs `prisma generate` automatically.

Add these environment variables in Railway dashboard:
```
NODE_ENV=production
```

### 5. Run Migrations + Seed
In Railway → your service → **Settings** → **Deploy** → set:
```
Start Command: npm run db:push && npm run db:seed && npm start
```

> After first deploy, change back to just `npm start` to avoid re-seeding.

### 6. Done! 🎉
Railway gives you a public URL like `https://annotation-studio-production.up.railway.app`

---

## 📁 Project Structure

```
annotation-studio/
├── prisma/
│   ├── schema.prisma          # DB schema
│   └── seed.mjs               # Sample data for all 7 types
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects/      # GET, POST projects
│   │   │   │   └── [projectId]/
│   │   │   │       ├── route.ts          # GET, PATCH, DELETE project
│   │   │   │       └── tasks/route.ts    # GET, POST tasks
│   │   │   ├── tasks/
│   │   │   │   └── [taskId]/
│   │   │   │       ├── route.ts          # GET, PATCH task
│   │   │   │       └── skip/route.ts     # POST skip
│   │   │   └── annotations/route.ts     # POST annotation
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Projects list
│   │   │   └── new/page.tsx   # Create project
│   │   └── projects/
│   │       └── [projectId]/page.tsx  # Annotation workspace
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ProjectAnnotator.tsx  # Main layout + keyboard shortcuts
│   │   │   ├── TaskSidebar.tsx       # Task list sidebar
│   │   │   └── AnnotationPanel.tsx   # Notes + action buttons
│   │   └── annotators/
│   │       ├── RendererRouter.tsx              # Dispatches to correct renderer
│   │       ├── TextClassificationRenderer.tsx
│   │       ├── NERRenderer.tsx
│   │       ├── ImageClassificationRenderer.tsx
│   │       ├── BoundingBoxRenderer.tsx
│   │       ├── AudioTranscriptionRenderer.tsx
│   │       ├── QAReviewRenderer.tsx
│   │       └── FreeformRenderer.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── utils.ts           # Helpers, type labels/icons/colors
│   └── types/
│       └── index.ts           # All TypeScript types
└── railway.json               # Railway deploy config
```

---

## 🔑 Keyboard Shortcuts

| Key           | Action                    |
|--------------|--------------------------|
| `→`           | Next task                 |
| `←`           | Previous task             |
| `Enter`       | Submit (when not in field)|
| `Ctrl+Enter`  | Submit (from any field)   |
| `1`–`5`       | Select label by hotkey    |

---

## 📋 Annotation Config Examples

### Text Classification
```json
{
  "labels": [
    { "value": "positive", "color": "#22c55e", "hotkey": "1" },
    { "value": "negative", "color": "#ef4444", "hotkey": "2" },
    { "value": "neutral",  "color": "#f59e0b", "hotkey": "3" }
  ],
  "allow_multiple": false,
  "instructions": "Select the overall sentiment."
}
```

### NER
```json
{
  "labels": [
    { "value": "PERSON",   "color": "#3b82f6", "hotkey": "1" },
    { "value": "ORG",      "color": "#f59e0b", "hotkey": "2" },
    { "value": "LOCATION", "color": "#22c55e", "hotkey": "3" }
  ],
  "instructions": "Select text spans and assign entity labels."
}
```

### Image Classification
```json
{
  "labels": [
    { "value": "cat",  "color": "#f59e0b", "hotkey": "1" },
    { "value": "dog",  "color": "#3b82f6", "hotkey": "2" },
    { "value": "other","color": "#8b5cf6", "hotkey": "3" }
  ],
  "allow_multiple": false,
  "instructions": "Select the label that best describes the image."
}
```

### Bounding Box
```json
{
  "labels": [
    { "value": "car",    "color": "#ef4444", "hotkey": "1" },
    { "value": "person", "color": "#3b82f6", "hotkey": "2" }
  ],
  "instructions": "Draw boxes around each object."
}
```

### Audio Transcription
```json
{
  "instructions": "Transcribe the audio. Use [unclear] for inaudible parts.",
  "show_timestamps": false,
  "languages": ["English", "Arabic", "Other"]
}
```

### Q&A Review
```json
{
  "rating_labels": [
    { "value": "correct",   "color": "#22c55e", "hotkey": "1" },
    { "value": "partial",   "color": "#f59e0b", "hotkey": "2" },
    { "value": "incorrect", "color": "#ef4444", "hotkey": "3" }
  ],
  "require_correction": false,
  "instructions": "Rate the AI answer for accuracy."
}
```

### Freeform
```json
{
  "instructions": "Review the content and share your thoughts.",
  "min_length": 20,
  "tags": ["good", "unclear", "needs-review", "duplicate"]
}
```

---

## ➕ Adding a New Annotation Type

1. **Add the type** to `src/types/index.ts`:
   - Add to `ProjectType` union
   - Add `Config` interface
   - Add `TaskData` interface
   - Add `Result` interface

2. **Create the renderer** `src/components/annotators/MyTypeRenderer.tsx`:
   - Accept `{ data, config, result, onChange }` props
   - Call `onChange(result)` whenever the user makes a selection

3. **Register it** in `src/components/annotators/RendererRouter.tsx`:
   ```tsx
   case "my_type":
     return <MyTypeRenderer ... />;
   ```

4. **Add helpers** in `src/lib/utils.ts`:
   - `getProjectTypeLabel`: display name
   - `getProjectTypeIcon`: emoji
   - `getProjectTypeColor`: badge colors

5. **Add default config** in `src/app/dashboard/new/page.tsx`:
   ```ts
   DEFAULT_CONFIGS["my_type"] = { ... }
   ```

6. **Add seed tasks** in `prisma/seed.mjs` (optional)

7. Re-run `npm run db:seed`

---

## API Reference

### Projects
```
GET    /api/projects              # List all projects
POST   /api/projects              # Create project
GET    /api/projects/:id          # Get project + tasks + stats
PATCH  /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

### Tasks
```
GET    /api/projects/:id/tasks    # List tasks for project
POST   /api/projects/:id/tasks    # Create task
GET    /api/tasks/:id             # Get single task
PATCH  /api/tasks/:id             # Update task status
POST   /api/tasks/:id/skip        # Skip task
```

### Annotations
```
POST   /api/annotations           # Save annotation (upserts per task)
```

---

## License

MIT
