"use client";

import { useState, useEffect } from "react";
import { Loan } from "../../lib/types";
import { AddLoanModal } from "./AddLoanModal";
import { RecordRepaymentModal } from "./RecordRepaymentModal";

type LoansSectionProps = {
  loans: Loan[];
  loading: boolean;
  onRefresh: () => void;
  externalShowAddLoan?: boolean;
  onAddLoanClose?: () => void;
  externalShowRepayment?: boolean;
  onRepaymentClose?: () => void;
};

export function LoansSection({
  loans,
  loading,
  onRefresh,
  externalShowAddLoan,
  onAddLoanClose,
  externalShowRepayment,
  onRepaymentClose,
}: LoansSectionProps) {
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showLoanPicker, setShowLoanPicker] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  useEffect(() => {
    if (externalShowAddLoan) setShowAddLoanModal(true);
  }, [externalShowAddLoan]);

  useEffect(() => {
    if (externalShowRepayment) {
      const activeLoans = loans.filter((l) => l.status === "ACTIVE");
      if (activeLoans.length === 1) {
        setSelectedLoan(activeLoans[0]);
        setShowRepaymentModal(true);
      } else {
        setShowLoanPicker(true);
      }
    }
  }, [externalShowRepayment]);

  const handleRecordRepayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowRepaymentModal(true);
  };

  const toggleExpand = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded bg-zinc-100" />
        <div className="h-16 animate-pulse rounded bg-zinc-100" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">Loans ({loans.length})</h3>
        <button
          onClick={() => setShowAddLoanModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add Loan
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">No loans yet</p>
          <button
            onClick={() => setShowAddLoanModal(true)}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add Your First Loan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const remainingBalance = loan.amount - loan.amountRepaid;
            const percentPaid = (loan.amountRepaid / loan.amount) * 100;
            const isExpanded = expandedLoanId === loan.id;

            return (
              <div
                key={loan.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-zinc-900">{loan.lenderName}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            loan.status === "ACTIVE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">
                        Taken: {new Date(loan.dateTaken).toLocaleDateString()}
                        {loan.dueDate && (
                          <> · Due: {new Date(loan.dueDate).toLocaleDateString()}</>
                        )}
                      </p>
                      {loan.notes && (
                        <p className="mt-1 text-sm text-zinc-500">{loan.notes}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-zinc-900">
                        MWK {remainingBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">remaining</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>MWK {loan.amountRepaid.toLocaleString()} paid</span>
                      <span>{percentPaid.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {loan.status === "ACTIVE" && (
                      <button
                        onClick={() => handleRecordRepayment(loan)}
                        className="flex-1 rounded-md border border-indigo-600 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Record Payment
                      </button>
                    )}
                    {loan.repayments && loan.repayments.length > 0 && (
                      <button
                        onClick={() => toggleExpand(loan.id)}
                        className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        {isExpanded ? "Hide" : "Show"} History ({loan.repayments.length})
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && loan.repayments && loan.repayments.length > 0 && (
                  <div className="border-t border-zinc-200 bg-zinc-50 p-4">
                    <h5 className="mb-3 text-sm font-semibold text-zinc-700">Repayment History</h5>
                    <div className="space-y-2">
                      {loan.repayments.map((repayment) => (
                        <div
                          key={repayment.id}
                          className="flex items-center justify-between rounded-md bg-white p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-zinc-900">
                              MWK {repayment.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {new Date(repayment.date).toLocaleDateString()}
                            </p>
                            {repayment.notes && (
                              <p className="mt-1 text-xs text-zinc-600">{repayment.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddLoanModal
        isOpen={showAddLoanModal}
        onClose={() => {
          setShowAddLoanModal(false);
          onAddLoanClose?.();
        }}
        onSuccess={onRefresh}
      />

      <RecordRepaymentModal
        isOpen={showRepaymentModal}
        onClose={() => {
          setShowRepaymentModal(false);
          setSelectedLoan(null);
          onRepaymentClose?.();
        }}
        loan={selectedLoan}
        onSuccess={onRefresh}
      />

      {/* Loan picker — shown when Record Repayment is triggered with multiple active loans */}
      {showLoanPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Select Loan to Repay</h2>
              <button
                onClick={() => { setShowLoanPicker(false); onRepaymentClose?.(); }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {loans.filter((l) => l.status === "ACTIVE").map((loan) => (
                <button
                  key={loan.id}
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowLoanPicker(false);
                    setShowRepaymentModal(true);
                  }}
                  className="w-full rounded-lg border border-zinc-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 transition"
                >
                  <p className="font-semibold text-zinc-900">{loan.lenderName}</p>
                  <p className="text-sm text-zinc-500">
                    Remaining: MWK {(loan.amount - loan.amountRepaid).toLocaleString()}
                    {loan.dueDate && ` · Due: ${new Date(loan.dueDate).toLocaleDateString()}`}
                  </p>
                </button>
              ))}
              {loans.filter((l) => l.status === "ACTIVE").length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">No active loans to repay</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
