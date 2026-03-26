-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('TONTINE', 'MICRO_SAVINGS');

-- AlterTable
ALTER TABLE "groups" ADD COLUMN "groupType" "GroupType" NOT NULL DEFAULT 'TONTINE';

