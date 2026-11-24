-- Per-property "Leave a review" link on the public listing page
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "review_button_url" TEXT;
