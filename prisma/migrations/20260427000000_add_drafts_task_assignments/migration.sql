DO $$ BEGIN
  CREATE TYPE "AnnotationStatus" AS ENUM ('DRAFT', 'SUBMITTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "annotations"
  ADD COLUMN IF NOT EXISTS "status" "AnnotationStatus" NOT NULL DEFAULT 'SUBMITTED';

CREATE UNIQUE INDEX IF NOT EXISTS "annotations_taskId_userId_key" ON "annotations"("taskId", "userId");
CREATE INDEX IF NOT EXISTS "annotations_status_idx" ON "annotations"("status");

CREATE TABLE IF NOT EXISTS "task_assignments" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_assignments_taskId_userId_key" ON "task_assignments"("taskId", "userId");
CREATE INDEX IF NOT EXISTS "task_assignments_taskId_idx" ON "task_assignments"("taskId");
CREATE INDEX IF NOT EXISTS "task_assignments_userId_idx" ON "task_assignments"("userId");

DO $$ BEGIN
  ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
