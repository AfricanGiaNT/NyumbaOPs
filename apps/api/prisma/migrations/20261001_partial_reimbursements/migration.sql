BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE "ReimbursementPayment" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paid_at" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReimbursementPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReimbursementPayment_amount_positive" CHECK ("amount" > 0)
);

CREATE INDEX "ReimbursementPayment_transaction_id_paid_at_idx" ON "ReimbursementPayment"("transaction_id", "paid_at");
CREATE INDEX "ReimbursementPayment_created_by_idx" ON "ReimbursementPayment"("created_by");

ALTER TABLE "ReimbursementPayment" ADD CONSTRAINT "ReimbursementPayment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReimbursementPayment" ADD CONSTRAINT "ReimbursementPayment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReimbursementPayment" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "ReimbursementPayment" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "ReimbursementPayment" FROM authenticated;
  END IF;
END $$;

COMMIT;
