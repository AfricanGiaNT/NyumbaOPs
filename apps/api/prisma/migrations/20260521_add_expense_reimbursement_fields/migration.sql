-- Add reimbursement tracking fields to transactions
ALTER TABLE "Transaction" ADD COLUMN "paid_by" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "requires_reimbursement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaction" ADD COLUMN "reimbursed_at" TIMESTAMP(3);
