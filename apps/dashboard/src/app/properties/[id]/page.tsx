"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, uploadPropertyImage, deletePropertyImage, triggerPublicRevalidation } from "../../../lib/api";
import {
  AnalyticsSummary,
  Category,
  Property,
  PropertyImage,
  Transaction,
  TransactionType,
} from "../../../lib/types";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingSkeleton } from "../../../components/LoadingSkeleton";
import { SummaryCard } from "../../../components/SummaryCard";
import { TransactionList } from "../../../components/TransactionList";
import { SidebarForm } from "../../../components/SidebarForm";
import { FormField } from "../../../components/FormField";
import { ActionButton } from "../../../components/ActionButton";
import { ImageUpload, ImageFile } from "../../../components/ImageUpload";

type TransactionForm = {
  categoryId: string;
  amount: number;
  currency: "MWK" | "GBP";
  date: string;
  notes: string;
};

const initialForm: TransactionForm = {
  categoryId: "",
  amount: 0,
  currency: "MWK",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

type PropertyFormState = {
  name: string;
  location: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  nightlyRate: string;
  currency: "MWK" | "GBP" | "USD";
  images: ImageFile[];
};

const initialPropertyForm: PropertyFormState = {
  name: "",
  location: "",
  bedrooms: "",
  bathrooms: "",
  maxGuests: "",
  nightlyRate: "",
  currency: "MWK",
  images: [],
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueForm, setRevenueForm] = useState<TransactionForm>(initialForm);
  const [expenseForm, setExpenseForm] = useState<TransactionForm>(initialForm);
  const [submitting, setSubmitting] = useState<TransactionType | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(initialPropertyForm);
  const [editingProperty, setEditingProperty] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const revenueCategories = useMemo(
    () => categories.filter((category) => category.type === "REVENUE"),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "EXPENSE"),
    [categories],
  );

  const loadProperty = () => {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    Promise.all([
      apiGet<Property>(`/properties/${propertyId}`),
      apiGet<AnalyticsSummary>(`/analytics/property/${propertyId}/summary?month=${month}`),
      apiGet<Transaction[]>(`/transactions?propertyId=${propertyId}`),
      apiGet<Category[]>("/categories"),
    ])
      .then(([propertyData, summaryData, transactionsData, categoriesData]) => {
        setProperty(propertyData);
        setSummary(summaryData);
        setTransactions(transactionsData);
        setCategories(categoriesData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  // Convert PropertyImage[] to ImageFile[] for form
  const propertyImagesToImageFiles = (images: PropertyImage[] = []): ImageFile[] => {
    return images.map((img, index) => ({
      url: img.url,
      alt: img.alt ?? undefined,
      isCover: img.isCover,
      sortOrder: img.sortOrder,
    }));
  };

  const handleOpenEdit = () => {
    if (!property) return;
    
    setPropertyForm({
      name: property.name,
      location: property.location || "",
      bedrooms: String(property.bedrooms),
      bathrooms: String(property.bathrooms),
      maxGuests: String(property.maxGuests),
      nightlyRate: property.nightlyRate ? String(property.nightlyRate) : "",
      currency: property.currency,
      images: propertyImagesToImageFiles(property.images),
    });
    setShowEditForm(true);
    setPropertyError(null);
  };

  const handleCloseEdit = () => {
    setShowEditForm(false);
    setPropertyForm(initialPropertyForm);
    setPropertyError(null);
  };

  const handleSaveProperty = async () => {
    if (!property) return;
    
    setEditingProperty(true);
    setPropertyError(null);
    
    try {
      const existingImages = property.images || [];
      const formImages = propertyForm.images;
      
      // Step 1: Upload new images and collect their URLs
      const imagesToUpload = formImages.filter((img) => img.file && !img.url);
      const uploadedImageUrls: string[] = [];
      
      for (const [index, img] of imagesToUpload.entries()) {
        if (!img.file) continue;
        
        try {
          const { publicUrl } = await uploadPropertyImage({
            propertyId: property.id,
            file: img.file,
            alt: img.alt,
            isCover: img.isCover,
            sortOrder: existingImages.length + index,
          });
          uploadedImageUrls.push(publicUrl);
        } catch (err) {
          console.error(`Failed to upload image ${img.file.name}:`, err);
          // Continue with other uploads
        }
      }
      
      // Step 2: Build final images array
      // Map form images to PropertyImage format, using uploaded URLs for new images
      const finalImages = formImages
        .map<PropertyImage | null>((img, index) => {
          // If it's a new upload, use the URL from upload response
          if (img.file && !img.url) {
            const uploadedUrl = uploadedImageUrls.shift();
            if (!uploadedUrl) return null; // Skip if upload failed
            return {
              url: uploadedUrl,
              alt: img.alt ?? null,
              isCover: img.isCover,
              sortOrder: index,
            };
          }
          // Existing image
          if (img.url) {
            return {
              url: img.url,
              alt: img.alt ?? null,
              isCover: img.isCover,
              sortOrder: index,
            };
          }
          return null;
        })
        .filter((img): img is PropertyImage => img !== null);
      
      // Step 3: Update property with all changes
      await apiPatch<Property>(`/properties/${property.id}`, {
        name: propertyForm.name,
        location: propertyForm.location || undefined,
        bedrooms: propertyForm.bedrooms ? Number(propertyForm.bedrooms) : 1,
        bathrooms: propertyForm.bathrooms ? Number(propertyForm.bathrooms) : 1,
        maxGuests: propertyForm.maxGuests ? Number(propertyForm.maxGuests) : 2,
        nightlyRate: propertyForm.nightlyRate ? Number(propertyForm.nightlyRate) : undefined,
        currency: propertyForm.currency,
        images: finalImages,
      });
      
      // Step 4: Reload property data to get newly uploaded image URLs
      await loadProperty();
      triggerPublicRevalidation(property.id);

      setShowEditForm(false);
      setPropertyForm(initialPropertyForm);
    } catch (err) {
      setPropertyError((err as Error).message);
    } finally {
      setEditingProperty(false);
    }
  };

  const handleSubmit = async (type: TransactionType) => {
    setError(null);
    setSubmitting(type);
    const form = type === "REVENUE" ? revenueForm : expenseForm;
    try {
      const payload = {
        ...form,
        notes: form.notes || undefined,
        propertyId,
      };
      const transaction = await apiPost<Transaction>(
        `/transactions/${type === "REVENUE" ? "revenue" : "expense"}`,
        payload,
      );
      setTransactions((prev) => [transaction, ...prev]);
      if (type === "REVENUE") {
        setRevenueForm(initialForm);
      } else {
        setExpenseForm(initialForm);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              {property?.name ?? "Property"}
            </h1>
            <p className="text-sm text-zinc-600">
              Track revenue, expenses, and profit.
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton
              variant="primary"
              onClick={handleOpenEdit}
              disabled={!property}
            >
              Edit Property
            </ActionButton>
            <Link
              href="/properties"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Back to Properties
            </Link>
          </div>
        </header>

        {loading && <LoadingSkeleton rows={6} />}
        {!loading && error && (
          <EmptyState title="Unable to load property" message={error} />
        )}

        {!loading && !error && summary && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summary.totals.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                message="Add revenue or expenses to see the summary."
              />
            ) : (
              summary.totals.map((item) => (
                <SummaryCard key={item.currency} summary={item} />
              ))
            )}
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add Revenue</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <select
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={revenueForm.categoryId}
                onChange={(event) =>
                  setRevenueForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="">Select revenue category</option>
                {revenueCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Amount"
                value={revenueForm.amount}
                onChange={(event) =>
                  setRevenueForm((prev) => ({
                    ...prev,
                    amount: Number(event.target.value),
                  }))
                }
              />
              <input
                type="date"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={revenueForm.date}
                onChange={(event) =>
                  setRevenueForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
              <input
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Notes (optional)"
                value={revenueForm.notes}
                onChange={(event) =>
                  setRevenueForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                onClick={() => handleSubmit("REVENUE")}
                disabled={submitting === "REVENUE" || !revenueForm.categoryId}
              >
                {submitting === "REVENUE" ? "Saving..." : "Save Revenue"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add Expense</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <select
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={expenseForm.categoryId}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="">Select expense category</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Amount"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    amount: Number(event.target.value),
                  }))
                }
              />
              <input
                type="date"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={expenseForm.date}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
              <input
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Notes (optional)"
                value={expenseForm.notes}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                onClick={() => handleSubmit("EXPENSE")}
                disabled={submitting === "EXPENSE" || !expenseForm.categoryId}
              >
                {submitting === "EXPENSE" ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <div className="mt-3">
            {transactions.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                message="Add revenue and expense records for this property."
              />
            ) : (
              <TransactionList transactions={transactions} />
            )}
          </div>
        </section>
      </div>

      {/* Edit Property Sidebar Form */}
      <SidebarForm
        isOpen={showEditForm}
        onClose={handleCloseEdit}
        title="Edit Property"
      >
        <div className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Basic Information
            </h3>
            <FormField label="Property Name" required htmlFor="edit-name">
              <input
                id="edit-name"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Beachside Villa"
                value={propertyForm.name}
                onChange={(event) =>
                  setPropertyForm((prev) => ({ ...prev, name: event.target.value }))
                }
                aria-required="true"
              />
            </FormField>

            <FormField
              label="Location"
              htmlFor="edit-location"
              helpText="City, neighborhood, or area"
            >
              <input
                id="edit-location"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Mangochi"
                value={propertyForm.location}
                onChange={(event) =>
                  setPropertyForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </FormField>
          </div>

          {/* Section 2: Property Images */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Property Images
            </h3>
            <p className="text-xs text-zinc-600">
              Add, remove, or reorder images. Mark one as cover photo.
            </p>
            <ImageUpload
              images={propertyForm.images}
              onChange={(images) => setPropertyForm((prev) => ({ ...prev, images }))}
              maxImages={12}
            />
          </div>

          {/* Section 3: Property Details */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bedrooms" required htmlFor="edit-bedrooms">
                <input
                  id="edit-bedrooms"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1"
                  value={propertyForm.bedrooms}
                  onChange={(event) =>
                    setPropertyForm((prev) => ({
                      ...prev,
                      bedrooms: event.target.value,
                    }))
                  }
                  aria-required="true"
                />
              </FormField>

              <FormField label="Bathrooms" required htmlFor="edit-bathrooms">
                <input
                  id="edit-bathrooms"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1"
                  value={propertyForm.bathrooms}
                  onChange={(event) =>
                    setPropertyForm((prev) => ({
                      ...prev,
                      bathrooms: event.target.value,
                    }))
                  }
                  aria-required="true"
                />
              </FormField>
            </div>

            <FormField
              label="Maximum Guests"
              required
              htmlFor="edit-maxGuests"
              helpText="Maximum number of guests allowed"
            >
              <input
                id="edit-maxGuests"
                type="number"
                min={1}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="2"
                value={propertyForm.maxGuests}
                onChange={(event) =>
                  setPropertyForm((prev) => ({
                    ...prev,
                    maxGuests: event.target.value,
                  }))
                }
                aria-required="true"
              />
            </FormField>
          </div>

          {/* Section 4: Pricing */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nightly Rate" htmlFor="edit-nightlyRate">
                <input
                  id="edit-nightlyRate"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional"
                  value={propertyForm.nightlyRate}
                  onChange={(event) =>
                    setPropertyForm((prev) => ({
                      ...prev,
                      nightlyRate: event.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label="Currency" required htmlFor="edit-currency">
                <select
                  id="edit-currency"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={propertyForm.currency}
                  onChange={(event) =>
                    setPropertyForm((prev) => ({
                      ...prev,
                      currency: event.target.value as PropertyFormState["currency"],
                    }))
                  }
                  aria-required="true"
                >
                  <option value="MWK">MWK</option>
                  <option value="GBP">GBP</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* Error Message */}
          {propertyError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {propertyError}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-zinc-200 pt-6">
            <ActionButton
              variant="primary"
              onClick={handleSaveProperty}
              disabled={editingProperty || !propertyForm.name}
              loading={editingProperty}
              className="flex-1"
            >
              {editingProperty ? "Saving..." : "Save Changes"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={handleCloseEdit}
              disabled={editingProperty}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      </SidebarForm>
    </AppLayout>
  );
}

