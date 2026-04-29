ALTER TABLE "users" ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY['ANNOTATOR']::"Role"[];

UPDATE "users"
SET "roles" = ARRAY["role"]::"Role"[];
