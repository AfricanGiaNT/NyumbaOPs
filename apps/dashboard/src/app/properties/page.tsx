"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, requestImageUpload, uploadFileToSignedUrl } from "../../lib/api";
import { Property } from "../../lib/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/LoadingSkeleton";
import { PropertyCard } from "../../components/PropertyCard";
import { SidebarForm } from "../../components/SidebarForm";
import { FormField } from "../../components/FormField";
import { ActionButton } from "../../components/ActionButton";
import { ImageUpload, ImageFile } from "../../components/ImageUpload";

type PropertyFormState = {
  name: string;
  location: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  nightlyRate: string;
  currency: "MWK" | "GBP";
  images: ImageFile[];
};

const initialForm: PropertyFormState = {
  name: "",
  location: "",
  bedrooms: "",
  bathrooms: "",
  maxGuests: "",
  nightlyRate: "",
  currency: "MWK",
  images: [],
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const loadProperties = () =>
    apiGet<Property[]>("/properties")
      .then((data) => setProperties(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProperties();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Step 1: Create property with basic info
      const payload = {
        name: form.name,
        location: form.location || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : 1,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : 1,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : 2,
        nightlyRate: form.nightlyRate ? Number(form.nightlyRate) : undefined,
        currency: form.currency,
        images: [],
        amenities: [],
      };
      
      const created = await apiPost<Property>("/properties", payload);
      
      // Step 2: Upload images if any
      if (form.images.length > 0) {
        await uploadPropertyImages(created.id, form.images);
      }
      
      setProperties((prev) => [created, ...prev]);
      setForm(initialForm);
      setShowAddForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  async function uploadPropertyImages(
    propertyId: string,
    images: ImageFile[]
  ) {
    for (const [index, img] of images.entries()) {
      if (!img.file) continue;
      
      try {
        // Request signed URL
        const { uploadUrl } = await requestImageUpload({
          propertyId,
          filename: img.file.name,
          contentType: img.file.type,
          alt: img.alt,
          isCover: img.isCover,
          sortOrder: index,
        });
        
        // Upload file to signed URL
        await uploadFileToSignedUrl(uploadUrl, img.file);
      } catch (err) {
        console.error(`Failed to upload image ${img.file.name}:`, err);
        // Continue with other images even if one fails
      }
    }
  }

  const handleClose = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingPropertyId(null);
    setForm(initialForm);
    setError(null);
  };

  const handleEdit = (property: Property) => {
    setForm({
      name: property.name,
      location: property.location || "",
      bedrooms: String(property.bedrooms),
      bathrooms: String(property.bathrooms),
      maxGuests: String(property.maxGuests),
      nightlyRate: property.nightlyRate ? String(property.nightlyRate) : "",
      currency: property.currency,
      images: (property.images || []).map((img) => ({
        url: img.url,
        alt: img.alt ?? undefined,
        isCover: img.isCover,
        sortOrder: img.sortOrder,
      })),
    });
    setEditingPropertyId(property.id);
    setShowEditForm(true);
    setError(null);
  };

  const handleUpdate = async () => {
    if (!editingPropertyId) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const existingProperty = properties.find(p => p.id === editingPropertyId);
      const existingImages = existingProperty?.images || [];
      
      // Upload new images
      const imagesToUpload = form.images.filter((img) => img.file && !img.url);
      for (const [index, img] of imagesToUpload.entries()) {
        if (!img.file) continue;
        
        try {
          const { uploadUrl } = await requestImageUpload({
            propertyId: editingPropertyId,
            filename: img.file.name,
            contentType: img.file.type,
            alt: img.alt,
            isCover: img.isCover,
            sortOrder: existingImages.length + index,
          });
          
          await uploadFileToSignedUrl(uploadUrl, img.file);
        } catch (err) {
          console.error(`Failed to upload image ${img.file.name}:`, err);
        }
      }
      
      // Build final images array (only existing images that weren't removed)
      const finalImages = form.images
        .filter((img) => img.url) // Only images with URLs
        .map((img, index) => ({
          url: img.url!,
          alt: img.alt ?? null,
          isCover: img.isCover,
          sortOrder: index,
        }));
      
      // Update property
      const updated = await apiPatch<Property>(`/properties/${editingPropertyId}`, {
        name: form.name,
        location: form.location || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : 1,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : 1,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : 2,
        nightlyRate: form.nightlyRate ? Number(form.nightlyRate) : undefined,
        currency: form.currency,
        images: finalImages,
      });
      
      // Update local state
      setProperties((prev) =>
        prev.map((p) => (p.id === editingPropertyId ? updated : p))
      );
      
      setForm(initialForm);
      setShowEditForm(false);
      setEditingPropertyId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-8 py-10 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Properties</h1>
            <p className="text-sm text-zinc-600">
              Manage your properties and log revenue or expenses.
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton
              variant="primary"
              onClick={() => setShowAddForm(true)}
            >
              + Add Property
            </ActionButton>
            <Link
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Back to Overview
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading && <LoadingSkeleton rows={6} />}
          {!loading && properties.length === 0 && (
            <EmptyState
              title="No properties yet"
              message="Add your first property to start tracking revenue and expenses."
            />
          )}
          {!loading &&
            properties.map((property) => (
              <PropertyCard 
                key={property.id} 
                property={property}
                onEdit={handleEdit}
              />
            ))}
        </section>
      </div>

      {/* Add Property Sidebar Form */}
      <SidebarForm
        isOpen={showAddForm}
        onClose={handleClose}
        title="Add Property"
      >
        <div className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Basic Information
            </h3>
            <FormField label="Property Name" required htmlFor="name">
              <input
                id="name"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Beachside Villa"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                aria-required="true"
              />
            </FormField>

            <FormField
              label="Location"
              htmlFor="location"
              helpText="City, neighborhood, or area"
            >
              <input
                id="location"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Mangochi"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
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
              Upload up to 6 images of your property. The first image or marked cover will be displayed on the property card.
            </p>
            <ImageUpload
              images={form.images}
              onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              maxImages={6}
            />
          </div>

          {/* Section 3: Property Details */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bedrooms" required htmlFor="bedrooms">
                <input
                  id="bedrooms"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1"
                  value={form.bedrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      bedrooms: event.target.value,
                    }))
                  }
                  aria-required="true"
                />
              </FormField>

              <FormField label="Bathrooms" required htmlFor="bathrooms">
                <input
                  id="bathrooms"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1"
                  value={form.bathrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
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
              htmlFor="maxGuests"
              helpText="Maximum number of guests allowed"
            >
              <input
                id="maxGuests"
                type="number"
                min={1}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="2"
                value={form.maxGuests}
                onChange={(event) =>
                  setForm((prev) => ({
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
              <FormField label="Nightly Rate" htmlFor="nightlyRate">
                <input
                  id="nightlyRate"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional"
                  value={form.nightlyRate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nightlyRate: event.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label="Currency" required htmlFor="currency">
                <select
                  id="currency"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((prev) => ({
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
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-zinc-200 pt-6">
            <ActionButton
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !form.name}
              loading={submitting}
              className="flex-1"
            >
              {submitting ? "Saving..." : "Save Property"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      </SidebarForm>

      {/* Edit Property Sidebar Form */}
      <SidebarForm
        isOpen={showEditForm}
        onClose={handleClose}
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
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
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
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
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
              Add, remove, or reorder images. Mark one as the cover photo.
            </p>
            <ImageUpload
              images={form.images}
              onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              maxImages={6}
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
                  value={form.bedrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
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
                  value={form.bathrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
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
                value={form.maxGuests}
                onChange={(event) =>
                  setForm((prev) => ({
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
                  value={form.nightlyRate}
                  onChange={(event) =>
                    setForm((prev) => ({
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
                  value={form.currency}
                  onChange={(event) =>
                    setForm((prev) => ({
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
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-zinc-200 pt-6">
            <ActionButton
              variant="primary"
              onClick={handleUpdate}
              disabled={submitting || !form.name}
              loading={submitting}
              className="flex-1"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      </SidebarForm>
    </div>
  );
}
