ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'DELETED';

ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "groups_deletedAt_idx" ON "groups"("deletedAt");

