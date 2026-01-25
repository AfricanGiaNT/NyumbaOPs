# Property Image Upload - Testing & Usage Guide

## Implementation Complete ✅

All features have been implemented successfully:

1. ✅ Updated type definitions with PropertyImage
2. ✅ Added storage emulator configuration
3. ✅ Created ImageUpload component with drag-and-drop
4. ✅ Added image upload API client functions
5. ✅ Integrated image upload into property creation form
6. ✅ Added cover image display to PropertyCard
7. ✅ No linter errors

## What Was Implemented

### Backend (Already Existed)
- `POST /v1/public/uploads` - Request signed upload URL
- Firebase Storage integration
- Image metadata stored in Firestore
- Path: `properties/{propertyId}/{timestamp}-{filename}`

### Frontend (New)

#### Type Definitions (`apps/dashboard/src/lib/types.ts`)
```typescript
export type PropertyImage = {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type Property = {
  // ... existing fields
  images?: PropertyImage[];
  amenities?: string[];
};
```

#### ImageUpload Component (`apps/dashboard/src/components/ImageUpload.tsx`)
- Drag-and-drop zone
- Multiple file selection (max 6 images)
- Client-side validation (JPEG/PNG/WebP, max 5MB)
- Image preview with thumbnails
- Remove image functionality
- Mark as cover photo
- First uploaded image is automatically cover
- User can change cover photo

#### API Functions (`apps/dashboard/src/lib/api.ts`)
```typescript
requestImageUpload()       // Get signed URL from backend
uploadFileToSignedUrl()    // Upload file to Firebase Storage
updatePropertyImages()     // Update property images
deletePropertyImage()      // Remove image from property
```

#### Property Form (`apps/dashboard/src/app/properties/page.tsx`)
- New "Property Images" section between Basic Info and Property Details
- Integrated ImageUpload component
- Two-step save process:
  1. Create property with basic info
  2. Upload images to the created property

#### PropertyCard Component (`apps/dashboard/src/components/PropertyCard.tsx`)
- Displays cover image at top of card
- Falls back to first image if no cover marked
- Gracefully handles properties without images

### Storage Configuration

#### Firebase Emulator (`firebase.json`)
```json
{
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "storage": { "port": 9199 }
  }
}
```

#### Storage Rules (`storage.rules`)
- Authenticated OWNER/STAFF can upload
- Public read access for all
- Files stored at: `properties/{propertyId}/*`

## How to Test

### Step 1: Start Storage Emulator

**IMPORTANT**: You need to restart your emulators to enable storage.

1. Stop current emulators (Ctrl+C)
2. Start emulators again:
   ```powershell
   firebase emulators:start
   ```

You should now see:
```
✔  storage: Storage Emulator running on port 9199
```

### Step 2: Restart Dashboard

The dashboard needs to pick up the new code changes:

1. Stop dashboard (Ctrl+C in terminal where it's running)
2. Restart:
   ```powershell
   pnpm -C apps/dashboard dev
   ```

### Step 3: Test Image Upload

#### Test Case 1: Create Property with Images

1. Go to http://localhost:3000/properties
2. Click "+ Add Property"
3. Fill in basic information:
   - Name: "Test Property with Images"
   - Location: "Lilongwe"

4. Scroll to "Property Images" section
5. Drag and drop an image OR click to browse
6. Upload 2-3 images (JPEG/PNG/WebP)
7. Verify:
   - ✅ Images show as thumbnails
   - ✅ First image has "⭐ Cover" badge
   - ✅ Hover shows "Set as Cover" and "Remove" buttons

8. Try marking a different image as cover:
   - Hover over second image
   - Click "Set as Cover"
   - ✅ Cover badge moves to that image

9. Fill in remaining fields (bedrooms, bathrooms, etc.)
10. Click "Save Property"
11. Wait for upload to complete
12. ✅ Form should close successfully
13. ✅ New property card should display with cover image

#### Test Case 2: Validation - File Type

1. Click "+ Add Property"
2. Try uploading a .txt or .pdf file
3. ✅ Should show error: "Invalid file type... Only JPEG, PNG, and WebP are allowed"

#### Test Case 3: Validation - Max Images

1. Click "+ Add Property"
2. Try uploading 7 images at once
3. ✅ Should show error: "Cannot add 7 images. Maximum 6 images allowed"

#### Test Case 4: Remove Images

1. Click "+ Add Property"
2. Upload 3 images
3. Remove the middle image
4. ✅ Image should be removed
5. ✅ Remaining images should keep their order

#### Test Case 5: Property Without Images

1. Click "+ Add Property"
2. Fill in only basic info (no images)
3. Save property
4. ✅ Should save successfully
5. ✅ Property card should display without image section

### Step 4: Verify in Firestore

1. Go to http://localhost:4000/firestore
2. Open the property you just created
3. Check the `images` array:
   ```json
   images: [
     {
       url: "https://storage.googleapis.com/...",
       alt: "image-name",
       sortOrder: 0,
       isCover: true
     }
   ]
   ```

### Step 5: Verify in Storage Emulator

1. Go to http://localhost:4000/storage
2. Navigate to `properties/{propertyId}/`
3. ✅ Should see uploaded files with timestamps

## Known Limitations (Emulator)

1. **Ephemeral Storage**: Storage emulator data is lost when emulator restarts
2. **No Image Optimization**: Images uploaded as-is (no compression)
3. **Local URLs**: Images use emulator URLs (localhost)
4. **No CDN**: No caching or CDN optimization

These are expected emulator behaviors. Production will use real Firebase Storage with CDN.

## Troubleshooting

### Issue: "Storage bucket not configured"

**Solution**: The emulator needs to be restarted with storage enabled.

```powershell
# Stop emulators
Ctrl+C

# Start again
firebase emulators:start
```

Verify storage is running:
```
✔  storage: Storage Emulator running on port 9199
```

### Issue: Images not showing in PropertyCard

**Possible Causes**:
1. **Images array is empty**: Check Firestore to confirm images were saved
2. **Cover not set**: First image should auto-set as cover
3. **Next.js Image optimization**: Emulator URLs might need special config

**Solution**: Check browser console for errors. Verify image URLs in Firestore.

### Issue: Upload fails silently

**Check**:
1. Browser console for errors
2. Functions emulator logs (Terminal 1)
3. Firestore to see if property was created

**Common causes**:
- User doesn't have OWNER role
- Storage emulator not running
- File too large (> 5MB)
- Invalid file type

### Issue: "Failed to upload image"

**Check browser console** for specific error. Common issues:
- Signed URL expired (15 minutes)
- Network error
- CORS issue (shouldn't happen with emulator)

## Production Deployment Notes

When deploying to production:

1. **Set Storage Bucket**:
   ```bash
   # In functions/.env
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

2. **Deploy Storage Rules**:
   ```bash
   firebase deploy --only storage
   ```

3. **Test with Real Firebase**:
   - Upload images to production
   - Verify CDN URLs work
   - Check storage rules are enforced

4. **Consider Optimizations**:
   - Add image compression
   - Generate thumbnails
   - Use Cloud Functions for image processing
   - Add lazy loading

## API Endpoint Reference

### Request Upload URL
```
POST /v1/public/uploads
Content-Type: application/json

{
  "propertyId": "abc123",
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "alt": "Optional description",
  "isCover": true,
  "sortOrder": 0
}

Response:
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.googleapis.com/...",
    "publicUrl": "https://storage.googleapis.com/..."
  }
}
```

### Upload File
```
PUT {uploadUrl}
Content-Type: image/jpeg
Body: <file binary>

Response: 200 OK
```

## Component API Reference

### ImageUpload Component

```tsx
<ImageUpload
  images={images}
  onChange={(newImages) => setImages(newImages)}
  maxImages={6}
  maxSizeMB={5}
/>
```

**Props**:
- `images`: Array of ImageFile objects
- `onChange`: Callback when images change
- `maxImages`: Maximum number of images (default: 6)
- `maxSizeMB`: Maximum file size in MB (default: 5)

**ImageFile Type**:
```typescript
{
  file?: File;           // Original file object
  url?: string;          // Public URL (for existing images)
  preview?: string;      // Preview URL (for new uploads)
  alt?: string;          // Alt text
  isCover: boolean;      // Is this the cover image?
  sortOrder: number;     // Display order
  uploading?: boolean;   // Upload in progress
}
```

## Next Steps

### Recommended Enhancements

1. **Progress Indicators**:
   - Show upload progress percentage
   - Disable form while uploading

2. **Image Editing**:
   - Allow editing alt text
   - Drag to reorder images
   - Crop/resize before upload

3. **Property Detail Page**:
   - Create `apps/dashboard/src/app/properties/[id]/page.tsx`
   - Show all property images
   - Allow adding/removing images after creation

4. **Error Handling**:
   - Better error messages
   - Retry failed uploads
   - Partial success handling

5. **Performance**:
   - Lazy load images
   - Use intersection observer
   - Add loading skeletons

6. **Mobile Optimization**:
   - Touch-friendly drag-and-drop
   - Camera capture on mobile
   - Optimize upload on slow connections

## Success Criteria ✅

All implementation tasks complete:
- [x] Type definitions updated
- [x] Storage emulator configured
- [x] ImageUpload component created
- [x] API functions implemented
- [x] Property form integrated
- [x] PropertyCard displays images
- [x] No linter errors
- [x] Testing guide created

**Ready for manual testing!**

Test the feature and verify:
1. Images upload successfully
2. Cover photo selection works
3. Property cards display cover images
4. Validation prevents invalid uploads
5. Remove image functionality works
