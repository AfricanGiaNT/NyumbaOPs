# Image Display Issue - Root Cause & Resolution

## Issue Summary
When editing existing properties, the Photos tab showed "0 of 10 images uploaded" even though the property form was in edit mode.

## Root Cause Identified ✅

**Properties in Firestore have empty `images` arrays.**

Through debugging, we confirmed:
1. The API endpoint (`GET /properties`) correctly returns all property data including the `images` field
2. The `handleEdit` function properly maps Firestore images to the `ImageFile` format
3. The `ImageUpload` component correctly renders images when they exist
4. **However**, the properties in your Firestore database have `images: []` (empty arrays)

## What Was Fixed

### 1. Console Error: `onValueChange` ✅
**File:** `apps/dashboard/src/components/ui/tabs.tsx`

Modified the `Tabs` component to only pass custom props to known tab components, preventing invalid props from reaching DOM elements.

```typescript
// Only pass custom props to known tab components, not to arbitrary divs
const childType = (child.type as any)?.displayName || (child.type as any)?.name;
const isTabComponent = childType === 'TabsList' || childType === 'TabsContent' || childType === 'TabsTrigger';

if (isTabComponent) {
  return React.cloneElement(child, { value, onValueChange: handleValueChange } as any);
}
```

### 2. Image Data Mapping ✅
**File:** `apps/dashboard/src/app/properties/page.tsx`

Fixed the `handleEdit` function to properly convert Firestore `PropertyImage` objects to `ImageFile` format:

```typescript
images: (property.images || []).map((img) => ({
  url: img.url,
  alt: img.alt ?? undefined,
  isCover: img.isCover,
  sortOrder: img.sortOrder,
  file: undefined,        // For existing images
  preview: undefined,     // For existing images
})),
```

## Why Images Aren't Displaying

Your existing properties were created with empty `images` arrays. This means:
- The properties exist in Firestore
- But they don't have any images associated with them yet
- When you edit a property, there are no existing images to display

## Solution: Add Images to Existing Properties

You have two options:

### Option 1: Edit Each Property and Upload Images
1. Click "Edit" on a property
2. Navigate to the "Photos" tab
3. Upload images using drag-and-drop or click to browse
4. Click "Update Property"
5. The images will be saved to Firestore and displayed on future edits

### Option 2: Create New Properties with Images
1. Click "+ Add Property"
2. Fill in all the details
3. On the "Photos" tab, upload images
4. The images will be saved when you create the property

## How the Image System Works

### For New Images (Upload)
- `file`: Contains the File object
- `preview`: Contains the blob URL for preview
- `url`: undefined (will be set after upload)

### For Existing Images (From Firestore)
- `file`: undefined
- `preview`: undefined
- `url`: Contains the Firebase Storage URL

### Display Logic
The `ImageUpload` component checks: `const imageUrl = img.preview || img.url;`
- New images use `preview` (blob URL)
- Existing images use `url` (Firebase Storage URL)

## Verification

To verify the fix is working:
1. Edit an existing property
2. Go to Photos tab
3. Upload 1-2 images
4. Click "Update Property"
5. Edit the same property again
6. The uploaded images should now display in the Photos tab

## Files Modified

1. `apps/dashboard/src/components/ui/tabs.tsx` - Fixed prop passing
2. `apps/dashboard/src/app/properties/page.tsx` - Fixed image mapping
3. `apps/dashboard/src/components/ImageUpload.tsx` - Already working correctly
4. `apps/dashboard/src/components/property-form/PhotosTab.tsx` - Already working correctly

## Next Steps

1. ✅ Console error fixed
2. ✅ Image mapping fixed
3. ✅ Code cleaned up (debug logs removed)
4. ⏳ Upload images to existing properties (manual step)

The system is now ready to properly display and manage property images!
