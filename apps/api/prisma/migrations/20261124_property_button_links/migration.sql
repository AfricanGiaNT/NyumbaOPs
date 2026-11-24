-- Per-property call-to-action button links on the public listing page
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "availability_button_url" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "availability_button_label" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "contact_button_url" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "contact_button_label" TEXT;
