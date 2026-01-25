-- Telegram bot support fields
ALTER TABLE "users" ADD COLUMN "telegram_id" TEXT;
ALTER TABLE "users" ADD COLUMN "telegram_username" TEXT;
CREATE UNIQUE INDEX "users_telegram_id_idx" ON "users" ("telegram_id") WHERE "telegram_id" IS NOT NULL;

ALTER TABLE "transactions" ADD COLUMN "created_via" TEXT NOT NULL DEFAULT 'DASHBOARD';
ALTER TABLE "transactions" ADD COLUMN "telegram_message_id" BIGINT;

ALTER TABLE "bookings" ADD COLUMN "check_out_issue_type" TEXT;
ALTER TABLE "bookings" ADD COLUMN "checked_in_by" UUID;
ALTER TABLE "bookings" ADD COLUMN "checked_out_by" UUID;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_checked_in_by_fkey"
  FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_checked_out_by_fkey"
  FOREIGN KEY ("checked_out_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "notification_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "new_inquiry_telegram" BOOLEAN NOT NULL DEFAULT true,
  "new_inquiry_email" BOOLEAN NOT NULL DEFAULT false,
  "booking_confirmed_telegram" BOOLEAN NOT NULL DEFAULT true,
  "booking_confirmed_email" BOOLEAN NOT NULL DEFAULT false,
  "daily_summary_telegram" BOOLEAN NOT NULL DEFAULT false,
  "daily_summary_email" BOOLEAN NOT NULL DEFAULT false,
  "daily_summary_time" TEXT DEFAULT '18:00',
  "weekly_summary_telegram" BOOLEAN NOT NULL DEFAULT false,
  "weekly_summary_day" INTEGER NOT NULL DEFAULT 1,
  "weekly_summary_hour" INTEGER NOT NULL DEFAULT 8,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_settings_user_id_idx" ON "notification_settings" ("user_id");

ALTER TABLE "notification_settings"
  ADD CONSTRAINT "notification_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
