-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xtfpppcqscwsnpdfrzmw/sql/new

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'SETTLED');

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "lender_name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "amount_repaid" INTEGER NOT NULL DEFAULT 0,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_taken" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_repayments" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_created_by_idx" ON "loans"("created_by");

-- CreateIndex
CREATE INDEX "loan_repayments_loan_id_idx" ON "loan_repayments"("loan_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_id_fkey"
    FOREIGN KEY ("loan_id") REFERENCES "loans"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
