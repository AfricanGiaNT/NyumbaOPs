"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { InventoryItem, Property } from "@/lib/types";
import { ModalFrame } from "../ModalFrame";
import { ShoppingList } from "./ShoppingList";

type Props = { isOpen: boolean; onClose: () => void; onRecorded: () => void };

export function ShoppingListModal({ isOpen, onClose, onRecorded }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inventory, propertyList] = await Promise.all([
        apiGet<InventoryItem[]>("/inventory"),
        apiGet<Property[]>("/properties"),
      ]);
      setItems(inventory);
      setProperties(propertyList);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the shopping list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOpen && !loaded && !loading && !error) void load(); }, [isOpen, loaded, loading, error, load]);

  const handleRecorded = () => {
    setLoaded(false);
    setVersion((current) => current + 1);
    onRecorded();
    onClose();
  };

  return (
    <ModalFrame open={isOpen} keepMounted wide onClose={onClose} title="Shopping List" description="Tick items as you grab them, then record what you bought">
      {loading && !loaded ? <div className="space-y-2" aria-label="Loading shopping list">{[1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}</div> :
        error && !loaded ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 rounded-lg bg-rose-700 px-3 py-1.5 font-medium text-white">Retry</button></div> :
        loaded ? <ShoppingList key={version} items={items} properties={properties} onComplete={handleRecorded} contained /> : null}
    </ModalFrame>
  );
}
