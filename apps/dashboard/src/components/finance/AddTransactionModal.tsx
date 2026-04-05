"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Property, Category, Currency, TransactionType } from "../../lib/types";

type AddTransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  onSuccess?: () => void;
};

export function AddTransactionModal({
  isOpen,
  onClose,
  type,
  onSuccess,
}: AddTransactionModalProps) {
  const [step, setStep] = useState<"property" | "category" | "details">("property");
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: null as string | null,
    categoryId: "",
    amount: "",
    currency: "MWK" as Currency,
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadProperties();
    }
  }, [isOpen]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Property[]>("/properties");
      setProperties(data);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const categoryType = type === "REVENUE" ? "REVENUE" : "EXPENSE";
      const data = await apiGet<Category[]>(`/categories?type=${categoryType}`);
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (propertyId: string | null) => {
    setFormData({ ...formData, propertyId });
    setStep("category");
    loadCategories();
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, categoryId });
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const endpoint = type === "REVENUE" ? "/transactions/revenue" : "/transactions/expense";
      await apiPost(endpoint, {
        propertyId: formData.propertyId,
        categoryId: formData.categoryId,
        amount: parseInt(formData.amount),
        currency: formData.currency,
        date: new Date().toISOString(),
        notes: formData.notes || undefined,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("property");
    setFormData({
      propertyId: null,
      categoryId: "",
      amount: "",
      currency: "MWK",
      notes: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            Add {type === "REVENUE" ? "Income" : "Expense"}
          </h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`h-2 w-2 rounded-full ${step === "property" ? "bg-indigo-600" : "bg-zinc-300"}`} />
          <div className={`h-2 w-2 rounded-full ${step === "category" ? "bg-indigo-600" : "bg-zinc-300"}`} />
          <div className={`h-2 w-2 rounded-full ${step === "details" ? "bg-indigo-600" : "bg-zinc-300"}`} />
        </div>

        {step === "property" && (
          <div>
            <p className="mb-4 text-sm text-zinc-600">Select a property (or general)</p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded bg-zinc-100" />
                <div className="h-12 animate-pulse rounded bg-zinc-100" />
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handlePropertySelect(null)}
                  className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <p className="font-medium text-zinc-900">General (All Properties)</p>
                </button>
                {properties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertySelect(property.id)}
                    className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:border-indigo-500 hover:bg-indigo-50"
                  >
                    <p className="font-medium text-zinc-900">{property.name}</p>
                    <p className="text-sm text-zinc-500">{property.location}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "category" && (
          <div>
            <p className="mb-4 text-sm text-zinc-600">Select a category</p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded bg-zinc-100" />
                <div className="h-12 animate-pulse rounded bg-zinc-100" />
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:border-indigo-500 hover:bg-indigo-50"
                  >
                    <p className="font-medium text-zinc-900">{category.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                placeholder="0"
                required
                min="1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Currency</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: "MWK" })}
                  className={`flex-1 rounded-lg border px-4 py-2 ${
                    formData.currency === "MWK"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-zinc-300 text-zinc-700"
                  }`}
                >
                  MWK
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: "USD" })}
                  className={`flex-1 rounded-lg border px-4 py-2 ${
                    formData.currency === "USD"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-zinc-300 text-zinc-700"
                  }`}
                >
                  USD
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                rows={3}
                placeholder="Add any notes..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("category")}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
