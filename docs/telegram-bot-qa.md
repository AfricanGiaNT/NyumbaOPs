# Telegram Bot QA Checklist

## Setup
- Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`.
- Ensure a user has `telegram_id` set in the database.
- Seed `notification_settings` for the user (or open /settings to create).

## Core Commands
- `/start` returns access denied for unauthorized user.
- `/start` shows main menu for authorized user.
- `/help` lists all commands.
- `/summary` matches dashboard totals (MWK/GBP).
- `/properties` shows property list and handles selection.
- `/property <name>` returns the correct property summary.
- `/bookings` lists recent bookings with correct status and nights.
- `/today` shows today’s check-ins and check-outs.
- `/status` shows occupancy status.

## Transaction Flows
- `/add_income` logs a REVENUE transaction with correct category and amount.
- `/add_expense` logs an EXPENSE transaction with correct category and amount.
- Inline property selection supports “General (All Properties)”.
- `/cancel` clears any active flow and returns the menu.
- `/undo` removes the last Telegram-created transaction within 5 minutes.
- `/undo` blocks after 5 minutes.

## Operational Flows
- `/checkin` lists confirmed bookings for today and updates status to CHECKED_IN.
- `/checkin` stores optional notes.
- `/checkout` lists checked-in bookings for today and updates status to COMPLETED.
- `/checkout` stores issue type and optional notes.

## Notifications & Scheduling
- Booking creation triggers Telegram alert (when booking alerts enabled).
- `/settings` toggles weekly report and alert preferences.
- Weekly report sends at configured day/hour (minute 0).
