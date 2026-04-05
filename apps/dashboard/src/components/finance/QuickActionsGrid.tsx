"use client";

type QuickActionsGridProps = {
  onAddRevenue: () => void;
  onAddExpense: () => void;
  onAddLoan: () => void;
  onRecordRepayment: () => void;
  onExportCsv: () => void;
};

export function QuickActionsGrid({
  onAddRevenue,
  onAddExpense,
  onAddLoan,
  onRecordRepayment,
  onExportCsv,
}: QuickActionsGridProps) {
  const actions = [
    {
      label: "Add Revenue",
      description: "Record income",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: onAddRevenue,
      color: "emerald" as const,
    },
    {
      label: "Add Expense",
      description: "Record a cost",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
      onClick: onAddExpense,
      color: "rose" as const,
    },
    {
      label: "Add Loan",
      description: "Track borrowing",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: onAddLoan,
      color: "amber" as const,
    },
    {
      label: "Record Repayment",
      description: "Pay off a loan",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onRecordRepayment,
      color: "indigo" as const,
    },
    {
      label: "Export CSV",
      description: "Download data",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExportCsv,
      color: "zinc" as const,
    },
  ];

  const colorMap = {
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    rose: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
    amber: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    indigo: "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    zinc: "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${colorMap[action.color]}`}
        >
          {action.icon}
          <div className="text-center">
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-xs opacity-70">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
