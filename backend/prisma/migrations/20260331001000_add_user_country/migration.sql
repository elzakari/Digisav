-- Add countryCode to users for currency/language defaults and KYC recognition
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "countryCode" VARCHAR(2);
