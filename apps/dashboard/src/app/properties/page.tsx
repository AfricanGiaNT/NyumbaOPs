"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, uploadPropertyImage, triggerPublicRevalidation } from "../../lib/api";
import { Property } from "../../lib/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/LoadingSkeleton";
import { PropertyCard } from "../../components/PropertyCard";
import { ActionButton } from "../../components/ActionButton";
import { PropertyFormDialog } from "../../components/property-form/PropertyFormDialog";
import { PropertyFormData } from "../../types/property-form";
import { ImageFile } from "../../components/ImageUpload";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";


export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingProperty, setEditingProperty] = useState<Partial<PropertyFormData> | undefined>(undefined);

  const loadProperties = () =>
    apiGet<Property[]>("/properties")
      .then((data) => setProperties(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProperties();
  }, []);

  const handleFormSubmit = async (formData: PropertyFormData) => {
    setError(null);
    try {
      if (dialogMode === "add") {
        // Step 1: Create property with all fields
        const payload = {
          name: formData.name,
          propertyType: formData.propertyType,
          location: formData.location,
          address: formData.address,
          description: formData.description,
          spaceDescription: formData.spaceDescription,
          guestAccess: formData.guestAccess,
          otherDetails: formData.otherDetails,
          highlights: formData.highlights,
          amenities: formData.amenities,
          bedrooms: formData.bedrooms,
          beds: formData.beds,
          bathrooms: formData.bathrooms,
          maxGuests: formData.maxGuests,
          propertySize: formData.propertySize,
          bedTypes: formData.bedTypes,
          nightlyRate: formData.nightlyRate,
          currency: formData.currency,
          weekendRate: formData.weekendRate,
          weeklyDiscount: formData.weeklyDiscount,
          monthlyDiscount: formData.monthlyDiscount,
          cleaningFee: formData.cleaningFee,
          securityDeposit: formData.securityDeposit,
          extraGuestFee: formData.extraGuestFee,
          minimumStay: formData.minimumStay,
          maximumStay: formData.maximumStay,
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          smokingAllowed: formData.smokingAllowed,
          petsAllowed: formData.petsAllowed,
          eventsAllowed: formData.eventsAllowed,
          quietHours: formData.quietHours,
          additionalRules: formData.additionalRules,
          cancellationPolicy: formData.cancellationPolicy,
          latitude: formData.latitude,
          longitude: formData.longitude,
          googleMapsUrl: formData.googleMapsUrl,
          status: formData.status.toUpperCase() as "ACTIVE" | "INACTIVE" | "MAINTENANCE",
        };
        
        const created = await apiPost<Property>("/properties", payload);
        
        // Step 2: Upload images if any
        if (formData.images.length > 0) {
          await uploadPropertyImages(created.id, formData.images);
          const updated = await apiGet<Property>(`/properties/${created.id}`);
          setProperties((prev: Property[]) => [updated, ...prev]);
        } else {
          setProperties((prev: Property[]) => [created, ...prev]);
        }
        triggerPublicRevalidation(created.id);
      } else {
        // Edit mode
        const propertyId = editingProperty?.id as string;
        if (!propertyId) return;

        // Step 1: Upload any new image files first so we have their URLs
        const uploadedUrls: string[] = [];
        for (const img of formData.images as ImageFile[]) {
          if (!img.file || img.url) continue;
          try {
            const { publicUrl } = await uploadPropertyImage({
              propertyId,
              file: img.file,
              alt: img.alt,
              isCover: img.isCover,
              sortOrder: 0, // will be overwritten by the PATCH below
            });
            uploadedUrls.push(publicUrl);
          } catch (err) {
            console.error(`Failed to upload image ${img.file.name}:`, err);
          }
        }

        // Step 2: Build the final images array preserving the user's order,
        // cover selection, and sort position (index = display order).
        const uploadedUrlsCopy = [...uploadedUrls];
        const finalImages = (formData.images as ImageFile[])
          .map((img, index) => {
            if (img.file && !img.url) {
              const url = uploadedUrlsCopy.shift();
              if (!url) return null;
              return { url, alt: img.alt ?? null, isCover: img.isCover, sortOrder: index };
            }
            if (img.url) {
              return { url: img.url, alt: img.alt ?? null, isCover: img.isCover, sortOrder: index };
            }
            return null;
          })
          .filter((img): img is NonNullable<typeof img> => img !== null);

        // Step 3: Single PATCH — property fields + full images array in one go
        await apiPatch<Property>(`/properties/${propertyId}`, {
          name: formData.name,
          propertyType: formData.propertyType,
          location: formData.location,
          address: formData.address,
          description: formData.description,
          spaceDescription: formData.spaceDescription,
          guestAccess: formData.guestAccess,
          otherDetails: formData.otherDetails,
          highlights: formData.highlights,
          amenities: formData.amenities,
          bedrooms: formData.bedrooms,
          beds: formData.beds,
          bathrooms: formData.bathrooms,
          maxGuests: formData.maxGuests,
          propertySize: formData.propertySize,
          bedTypes: formData.bedTypes,
          nightlyRate: formData.nightlyRate,
          currency: formData.currency,
          weekendRate: formData.weekendRate,
          weeklyDiscount: formData.weeklyDiscount,
          monthlyDiscount: formData.monthlyDiscount,
          cleaningFee: formData.cleaningFee,
          securityDeposit: formData.securityDeposit,
          extraGuestFee: formData.extraGuestFee,
          minimumStay: formData.minimumStay,
          maximumStay: formData.maximumStay,
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          smokingAllowed: formData.smokingAllowed,
          petsAllowed: formData.petsAllowed,
          eventsAllowed: formData.eventsAllowed,
          quietHours: formData.quietHours,
          additionalRules: formData.additionalRules,
          cancellationPolicy: formData.cancellationPolicy,
          latitude: formData.latitude,
          longitude: formData.longitude,
          googleMapsUrl: formData.googleMapsUrl,
          status: formData.status.toUpperCase() as "ACTIVE" | "INACTIVE" | "MAINTENANCE",
          images: finalImages,
        });

        // Step 4: Reload property
        const updated = await apiGet<Property>(`/properties/${propertyId}`);
        setProperties((prev: Property[]) =>
          prev.map((p: Property) => (p.id === propertyId ? updated : p))
        );
        triggerPublicRevalidation(propertyId);
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  async function uploadPropertyImages(
    propertyId: string,
    images: ImageFile[]
  ) {
    await Promise.allSettled(
      images.map((img, index) => {
        if (!img.file) return Promise.resolve();
        return uploadPropertyImage({
          propertyId,
          file: img.file,
          alt: img.alt,
          isCover: img.isCover,
          sortOrder: index,
        }).catch((err) => {
          console.error(`Failed to upload image ${img.file!.name}:`, err);
        });
      })
    );
  }

  const handleDelete = async (property: Property) => {
    if (!confirm(`Delete "${property.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/properties/${property.id}`);
      setProperties((prev: Property[]) => prev.filter((p: Property) => p.id !== property.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty({
      id: property.id,
      name: property.name,
      propertyType: (property as any).propertyType || "apartment",
      location: property.location || "",
      address: (property as any).address,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      googleMapsUrl: property.googleMapsUrl ?? "",
      description: (property as any).description,
      spaceDescription: (property as any).spaceDescription,
      guestAccess: (property as any).guestAccess,
      otherDetails: (property as any).otherDetails,
      highlights: (property as any).highlights || [],
      amenities: property.amenities || [],
      bedrooms: property.bedrooms,
      beds: (property as any).beds || property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      propertySize: (property as any).propertySize,
      bedTypes: (property as any).bedTypes || [],
      nightlyRate: property.nightlyRate || 0,
      currency: property.currency,
      weekendRate: (property as any).weekendRate,
      weeklyDiscount: (property as any).weeklyDiscount,
      monthlyDiscount: (property as any).monthlyDiscount,
      cleaningFee: (property as any).cleaningFee,
      securityDeposit: (property as any).securityDeposit,
      extraGuestFee: (property as any).extraGuestFee,
      minimumStay: (property as any).minimumStay || 1,
      maximumStay: (property as any).maximumStay,
      checkInTime: (property as any).checkInTime || "15:00",
      checkOutTime: (property as any).checkOutTime || "11:00",
      smokingAllowed: (property as any).smokingAllowed || false,
      petsAllowed: (property as any).petsAllowed || false,
      eventsAllowed: (property as any).eventsAllowed || false,
      quietHours: (property as any).quietHours,
      additionalRules: (property as any).additionalRules,
      cancellationPolicy: (property as any).cancellationPolicy || "moderate",
      status: property.status ? (property.status.toLowerCase() as "active" | "inactive" | "maintenance") : "active",
      images: (property.images || []).map((img) => ({
        url: img.url,
        alt: img.alt ?? undefined,
        isCover: img.isCover,
        sortOrder: img.sortOrder,
        file: undefined,
        preview: undefined,
      })),
    });
    setDialogMode("edit");
    setShowDialog(true);
    setError(null);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Properties</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Manage your properties and log revenue or expenses.
              </p>
            </div>
            <ActionButton
              variant="primary"
              onClick={() => {
                setDialogMode("add");
                setEditingProperty(undefined);
                setShowDialog(true);
              }}
            >
              + Add Property
            </ActionButton>
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
              properties.map((property: Property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
          </section>
        </div>

        {/* Property Form Dialog */}
        <PropertyFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          initialData={editingProperty}
          onSubmit={handleFormSubmit}
          mode={dialogMode}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
