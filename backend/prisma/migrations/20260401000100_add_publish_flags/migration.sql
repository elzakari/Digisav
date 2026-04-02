ALTER TABLE "transactions" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "transactions" ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "savings_deposits" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "savings_deposits" ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "transactions_isPublished_idx" ON "transactions"("isPublished");
CREATE INDEX "savings_deposits_isPublished_idx" ON "savings_deposits"("isPublished");

