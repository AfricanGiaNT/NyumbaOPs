BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
CREATE TYPE "ReservationEmailStatus" AS ENUM ('PENDING', 'SENT');

ALTER TABLE "Inquiry" ADD COLUMN "reviewed_by" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "Inquiry" ADD COLUMN "confirmed_by" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "confirmed_at" TIMESTAMP(3);
CREATE INDEX "Inquiry_property_id_status_created_at_idx" ON "Inquiry"("property_id", "status", "created_at");

CREATE TABLE "ReservationEmail" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "ReservationEmailStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReservationEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReservationEmail_event_key_key" ON "ReservationEmail"("event_key");
CREATE INDEX "ReservationEmail_status_next_attempt_at_idx" ON "ReservationEmail"("status", "next_attempt_at");
CREATE INDEX "ReservationEmail_inquiry_id_idx" ON "ReservationEmail"("inquiry_id");
ALTER TABLE "ReservationEmail" ADD CONSTRAINT "ReservationEmail_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationEmail" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ReservationEmail" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "ReservationEmail" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON "ReservationEmail" FROM authenticated';
  END IF;
END $$;

COMMIT;
