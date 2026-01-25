import { Transaction } from "../lib/types";

const typeStyles: Record<Transaction["type"], string> = {
  REVENUE: "text-emerald-700",
  EXPENSE: "text-rose-700",
};

export function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 text-sm"
        >
          <div>
            <div className="font-medium text-zinc-900">
              {new Date(transaction.date).toLocaleDateString()}
            </div>
            <div className="text-zinc-500">
              {transaction.notes ?? "No notes"}
            </div>
          </div>
          <div className={`font-semibold ${typeStyles[transaction.type]}`}>
            {transaction.currency} {transaction.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

