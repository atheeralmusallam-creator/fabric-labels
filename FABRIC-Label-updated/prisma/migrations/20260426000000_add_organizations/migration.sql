-- Add organizations and attach existing projects to a default ALLAM organization.
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "projects_organizationId_idx" ON "projects"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_organizationId_fkey'
  ) THEN
    ALTER TABLE "projects"
    ADD CONSTRAINT "projects_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "organizations" ("id", "name", "description", "createdAt", "updatedAt")
VALUES ('org_allam', 'ALLAM', 'Default organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "projects" SET "organizationId" = 'org_allam' WHERE "organizationId" IS NULL;
