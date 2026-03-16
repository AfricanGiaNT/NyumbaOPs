"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PropertyFormData, DEFAULT_FORM_DATA } from "@/types/property-form";
import { BasicInfoTab } from "./BasicInfoTab";
import { DescriptionTab } from "./DescriptionTab";
import { AmenitiesTab } from "./AmenitiesTab";
import { PhotosTab } from "./PhotosTab";
import { DetailsTab } from "./DetailsTab";
import { PricingTab } from "./PricingTab";
import { RulesTab } from "./RulesTab";

export interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PropertyFormData>;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  mode: "add" | "edit";
}

const TABS = [
  { id: "basic", label: "Basic Info", icon: "🏠" },
  { id: "description", label: "Description", icon: "📝" },
  { id: "amenities", label: "Amenities", icon: "✨" },
  { id: "photos", label: "Photos", icon: "📷" },
  { id: "details", label: "Details", icon: "📊" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "rules", label: "Rules", icon: "📋" },
];

export function PropertyFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  mode,
}: PropertyFormDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<PropertyFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setFormData({
      ...DEFAULT_FORM_DATA,
      ...initialData,
    });
    setActiveTab("basic");
    setErrors({});
  }, [open, initialData]);

  const updateFormData = (updates: Partial<PropertyFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateTab = (tabId: string): boolean => {
    const newErrors: Record<string, string> = {};

    switch (tabId) {
      case "basic":
        if (!formData.name.trim()) newErrors.name = "Property name is required";
        if (!formData.location.trim()) newErrors.location = "Location is required";
        break;
      case "photos":
        if (formData.images.length === 0) {
          newErrors.images = "At least one photo is required";
        }
        break;
      case "details":
        if (formData.bedrooms < 0) newErrors.bedrooms = "Invalid number";
        if (formData.bathrooms < 0) newErrors.bathrooms = "Invalid number";
        if (formData.maxGuests < 1) newErrors.maxGuests = "At least 1 guest required";
        break;
      case "pricing":
        if (formData.nightlyRate <= 0) {
          newErrors.nightlyRate = "Nightly rate must be greater than 0";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Clear errors when navigating
    setErrors({});
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    // Clear errors when navigating
    setErrors({});
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    // Validate all required tabs
    const validationErrors: Record<string, string> = {};
    
    // Basic info validation
    if (!formData.name.trim()) validationErrors.name = "Property name is required";
    if (!formData.location.trim()) validationErrors.location = "Location is required";
    
    // Photos validation
    if (formData.images.length === 0) {
      validationErrors.images = "At least one photo is required";
    }
    
    // Details validation
    if (formData.bedrooms < 0) validationErrors.bedrooms = "Invalid number";
    if (formData.bathrooms < 0) validationErrors.bathrooms = "Invalid number";
    if (formData.maxGuests < 1) validationErrors.maxGuests = "At least 1 guest required";
    
    // Pricing validation
    if (formData.nightlyRate <= 0) {
      validationErrors.nightlyRate = "Nightly rate must be greater than 0";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Navigate to first tab with errors
      if (validationErrors.name || validationErrors.location) {
        setActiveTab("basic");
      } else if (validationErrors.images) {
        setActiveTab("photos");
      } else if (validationErrors.bedrooms || validationErrors.bathrooms || validationErrors.maxGuests) {
        setActiveTab("details");
      } else if (validationErrors.nightlyRate) {
        setActiveTab("pricing");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      setFormData({ ...DEFAULT_FORM_DATA });
      setActiveTab("basic");
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabCompletionStatus = (tabId: string): boolean => {
    switch (tabId) {
      case "basic":
        return !!(formData.name && formData.location);
      case "description":
        return !!(formData.description || formData.highlights?.length);
      case "amenities":
        return formData.amenities.length > 0;
      case "photos":
        return formData.images.length > 0;
      case "details":
        return formData.bedrooms > 0 || formData.bathrooms > 0;
      case "pricing":
        return formData.nightlyRate > 0;
      case "rules":
        return !!(formData.checkInTime || formData.checkOutTime);
      default:
        return false;
    }
  };

  const calculateProgress = () => {
    let completed = 0;
    const total = TABS.length;

    TABS.forEach((tab) => {
      if (getTabCompletionStatus(tab.id)) {
        completed++;
      }
    });

    return (completed / total) * 100;
  };

  const currentTabIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader className="pb-4">
          <DialogTitle>
            {mode === "add" ? "Add New Property" : "Edit Property"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to {mode === "add" ? "create" : "update"} your
            property listing.
          </DialogDescription>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
              <span>Progress</span>
              <span>{Math.round(calculateProgress())}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-1.5" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            setErrors({});
          }} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full flex-shrink-0">
              {TABS.map((tab) => {
                const hasData = getTabCompletionStatus(tab.id);
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    currentValue={activeTab}
                    className="flex items-center gap-1.5 text-xs sm:text-sm relative"
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {hasData && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6">
              <TabsContent value="basic" currentValue={activeTab}>
                <BasicInfoTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="description" currentValue={activeTab}>
                <DescriptionTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="amenities" currentValue={activeTab}>
                <AmenitiesTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="photos" currentValue={activeTab}>
                <PhotosTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="details" currentValue={activeTab}>
                <DetailsTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="pricing" currentValue={activeTab}>
                <PricingTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>

              <TabsContent value="rules" currentValue={activeTab}>
                <RulesTab
                  data={formData}
                  onChange={updateFormData}
                  errors={errors}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="order-2 sm:order-1"
          >
            Cancel
          </Button>
          <div className="flex gap-2 order-1 sm:order-2 flex-1 sm:flex-initial justify-end">
            {!isFirstTab && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrevious}
                className="flex-1 sm:flex-initial"
              >
                ← Previous
              </Button>
            )}
            {!isLastTab ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="flex-1 sm:flex-initial"
              >
                Next →
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                {isSubmitting
                  ? "Saving..."
                  : mode === "add"
                  ? "Create Property"
                  : "Update Property"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
