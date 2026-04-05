-- Add password_hash column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- Update Currency enum: add USD, remove GBP
-- Step 1: Add the new USD value to the enum
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'USD';

-- Step 2: Update any existing GBP values to MWK (safe default)
UPDATE "Transaction" SET "currency" = 'MWK' WHERE "currency" = 'GBP';
UPDATE "Property" SET "currency" = 'MWK' WHERE "currency" = 'GBP';

-- Note: Removing 'GBP' from the enum requires recreating it.
-- Run the following only after confirming no GBP records remain:
--
-- ALTER TYPE "Currency" RENAME TO "Currency_old";
-- CREATE TYPE "Currency" AS ENUM ('MWK', 'USD');
-- ALTER TABLE "Transaction" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::text::"Currency";
-- ALTER TABLE "Property" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::text::"Currency";
-- DROP TYPE "Currency_old";
