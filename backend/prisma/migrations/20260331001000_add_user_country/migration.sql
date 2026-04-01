-- Add countryCode to users for currency/language defaults and KYC recognition
ALTER TABLE "users" ADD COLUMN "countryCode" VARCHAR(2);

