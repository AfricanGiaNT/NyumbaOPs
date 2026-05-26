"use client";

import { InventoryItem } from "@/lib/types";

type Props = {
  items: InventoryItem[];
  onClose: () => void;
};

export function RestockListModal({ items, onClose }: Props) {
  if (items.length === 0) return null;

  // Group by property
  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    const name = item.property?.name ?? "Unknown Property";
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(item);
  }

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const lines: string[] = ["📋 *Restock List*", ""];
    for (const [property, propItems] of Object.entries(grouped)) {
      lines.push(`🏠 *${property}*`);
      for (const item of propItems) {
        lines.push(`  • ${item.name} (${item.quantity}/${item.minQuantity} ${item.unit})`);
      }
      lines.push("");
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#restock-print-area) { display: none !important; }
          #restock-print-area { position: fixed; inset: 0; background: white; padding: 2rem; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
        <div id="restock-print-area" className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 no-print">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Restock List</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{items.length} item{items.length !== 1 ? "s" : ""} below par</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 print:hidden">
              Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {Object.entries(grouped).map(([property, propItems]) => (
              <div key={property}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <svg className="h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  {property}
                </h3>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 hidden sm:table-cell">Category</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500">Have / Need</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {propItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">{item.name}</td>
                          <td className="px-3 py-2 text-xs text-zinc-500 hidden sm:table-cell capitalize">
                            {item.category.replace(/_/g, " ").toLowerCase()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-red-600 dark:text-red-400 font-medium">{item.quantity}</span>
                            <span className="text-zinc-400 mx-1">/</span>
                            <span className="text-zinc-600 dark:text-zinc-400">{item.minQuantity}</span>
                            <span className="text-xs text-zinc-400 ml-1">{item.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 no-print">
            <button
              onClick={handleWhatsApp}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.534 5.856L0 24l6.335-1.509A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.878 9.878 0 01-5.031-1.371l-.361-.214-3.762.896.952-3.654-.234-.375A9.849 9.849 0 012.118 12C2.118 6.548 6.548 2.118 12 2.118S21.882 6.548 21.882 12 17.452 21.882 12 21.882z"/>
              </svg>
              Share via WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
