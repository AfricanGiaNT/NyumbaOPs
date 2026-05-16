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
    emerald: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
    rose: "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50",
    amber: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50",
    indigo: "border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50",
    zinc: "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700",
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
