-- Add extended fields to Property table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/xtfpppcqscwsnpdfrzmw/sql/new

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "property_type" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "space_description" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "guest_access" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "other_details" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "highlights" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "beds" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "property_size" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "bed_types" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "weekend_rate" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "weekly_discount" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "monthly_discount" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "cleaning_fee" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "security_deposit" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "extra_guest_fee" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "minimum_stay" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "maximum_stay" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "check_in_time" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "check_out_time" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "smoking_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "pets_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "events_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "quiet_hours" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "additional_rules" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "cancellation_policy" TEXT;
