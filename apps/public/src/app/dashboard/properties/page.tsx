"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, requestImageUpload, uploadFileToSignedUrl } from "@/lib/dashboard/api";
import { Property } from "@/lib/dashboard/types";
import { EmptyState } from "@/components/dashboard-app/EmptyState";
import { LoadingSkeleton } from "@/components/dashboard-app/LoadingSkeleton";
import { PropertyCard } from "@/components/dashboard-app/PropertyCard";
import { ActionButton } from "@/components/dashboard-app/ActionButton";
import { PropertyFormDialog } from "@/components/dashboard-app/property-form/PropertyFormDialog";
import { PropertyFormData } from "@/types/dashboard/property-form";
import { ImageFile } from "@/components/dashboard-app/ImageUpload";
import { ProtectedRoute } from "@/components/dashboard-app/ProtectedRoute";


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
          status: formData.status,
          images: [],
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
      } else {
        // Edit mode
        const propertyId = editingProperty?.id as string;
        if (!propertyId) return;
        
        // Step 1: Update property with all fields
        const existingImageData = formData.images
          .filter((img: ImageFile) => img.url && !img.file)
          .map((img: ImageFile, index: number) => ({
            url: img.url!,
            alt: img.alt ?? null,
            isCover: img.isCover,
            sortOrder: index,
          }));
        
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
          status: formData.status,
          images: existingImageData,
        });
        
        // Step 2: Upload new images if any
        const imagesToUpload = formData.images.filter(
          (img: ImageFile) => img.file && !img.url
        );
        
        if (imagesToUpload.length > 0) {
          for (const [index, img] of imagesToUpload.entries()) {
            if (!img.file) continue;
            
            try {
              const { uploadUrl } = await requestImageUpload({
                propertyId,
                filename: img.file.name,
                contentType: img.file.type,
                alt: img.alt,
                isCover: img.isCover,
                sortOrder: existingImageData.length + index,
              });
              
              await uploadFileToSignedUrl(uploadUrl, img.file);
            } catch (err) {
              console.error(`Failed to upload image ${img.file.name}:`, err);
            }
          }
        }
        
        // Step 3: Reload property
        const updated = await apiGet<Property>(`/properties/${propertyId}`);
        setProperties((prev: Property[]) =>
          prev.map((p: Property) => (p.id === propertyId ? updated : p))
        );
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
                onClick={() => {
                  setDialogMode("add");
                  setEditingProperty(undefined);
                  setShowDialog(true);
                }}
              >
                + Add Property
              </ActionButton>
              <Link
                href="/dashboard"
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
              properties.map((property: Property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property}
                  onEdit={handleEdit}
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
      </div>
    </ProtectedRoute>
  );
}
