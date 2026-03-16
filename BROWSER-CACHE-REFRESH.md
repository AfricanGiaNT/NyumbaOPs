# Browser Cache Refresh Guide

## Issue
After updating the ImageUpload component with new features (drag-to-reorder, enhanced grid layout), the changes may not be visible due to browser caching.

## Solutions

### Quick Fix: Hard Refresh
The fastest way to see your changes:

**Windows/Linux:**
```
Ctrl + Shift + R
```
or
```
Ctrl + F5
```

**Mac:**
```
Cmd + Shift + R
```

### DevTools Method (Recommended for Development)
1. Open DevTools: Press `F12` or right-click → Inspect
2. Go to the **Network** tab
3. Check the box **"Disable cache"**
4. Keep DevTools open while developing
5. Reload the page normally (`F5` or `Ctrl+R`)

### Clear Browser Cache Completely

**Chrome:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Choose time range: "All time"
4. Click "Clear data"

**Firefox:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached Web Content"
3. Click "Clear Now"

**Edge:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear now"

### Restart Development Server
Sometimes the dev server needs a restart:

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

## Verifying the Fix

After clearing cache, you should see:

✅ **ImageUpload Component:**
- Existing images displayed in a grid (2-4 columns)
- Drag handle indicator (⋮⋮) appears on hover
- Red delete button on each image (always visible on mobile, hover on desktop)
- "Cover" badge on the first image
- "Set as Cover" button on non-cover images (visible on hover)
- Order numbers (1, 2, 3...) in bottom-right corner
- Drag-and-drop to reorder functionality

✅ **Tabs Component:**
- No console errors about `onValueChange`
- Tabs switch smoothly when clicked
- All tab content displays correctly

## Prevention

To avoid cache issues during development:
- Keep DevTools open with "Disable cache" checked
- Use incognito/private browsing mode for testing
- Consider using a service worker cache-busting strategy in production
