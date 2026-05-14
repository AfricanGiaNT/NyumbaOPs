-- Add Any.do email tracking fields to works table
ALTER TABLE "works" ADD COLUMN IF NOT EXISTS "sent_to_any_do" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "works" ADD COLUMN IF NOT EXISTS "sent_to_any_do_at" TIMESTAMP(3);
