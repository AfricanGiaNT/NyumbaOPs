import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../lib/firebase";
import { validateICalUrl } from "./ical-parser";
import { syncCalendar } from "./sync-engine";

/**
 * Create calendar sync configuration
 * POST /api/v1/calendar-syncs
 */
export const createCalendarSync = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { propertyId, platform, icalUrl, isEnabled = true, syncFrequency = 30 } = req.body;

    // Validate required fields
    if (!propertyId || !platform || !icalUrl) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate iCal URL
    if (!validateICalUrl(icalUrl)) {
      res.status(400).json({ error: 'Invalid iCal URL. Must be HTTPS and end with .ics' });
      return;
    }

    // Check if property exists
    const propertyDoc = await db.collection('properties').doc(propertyId).get();
    if (!propertyDoc.exists) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check if calendar sync already exists
    const existingSync = await db.collection('calendar_syncs').doc(propertyId).get();
    if (existingSync.exists) {
      res.status(409).json({ error: 'Calendar sync already exists for this property' });
      return;
    }

    // Create calendar sync
    const now = new Date().toISOString();
    await db.collection('calendar_syncs').doc(propertyId).set({
      propertyId,
      platform,
      icalUrl,
      isEnabled,
      syncFrequency,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.collection('calendar_syncs').doc(propertyId).get();
    res.json({ success: true, data: { id: created.id, ...created.data() } });
  } catch (error: any) {
    console.error('Failed to create calendar sync', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all calendar syncs
 * GET /api/v1/calendar-syncs
 */
export const getCalendarSyncs = onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const snapshot = await db.collection('calendar_syncs').orderBy('createdAt', 'desc').get();
    const syncs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: syncs });
  } catch (error: any) {
    console.error('Failed to get calendar syncs', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get calendar sync by property ID
 * GET /api/v1/calendar-syncs/:propertyId
 */
export const getCalendarSync = onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const propertyId = req.path.split('/').pop();
    if (!propertyId) {
      res.status(400).json({ error: 'Property ID required' });
      return;
    }

    const doc = await db.collection('calendar_syncs').doc(propertyId).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Calendar sync not found' });
      return;
    }

    // Get recent sync logs
    const logsSnapshot = await db.collection('calendar_sync_logs')
      .where('propertyId', '==', propertyId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const logs = logsSnapshot.docs.map(log => ({ id: log.id, ...log.data() }));

    res.json({ 
      success: true, 
      data: { 
        id: doc.id, 
        ...doc.data(),
        syncLogs: logs,
      } 
    });
  } catch (error: any) {
    console.error('Failed to get calendar sync', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update calendar sync
 * PATCH /api/v1/calendar-syncs/:propertyId
 */
export const updateCalendarSync = onRequest(async (req, res) => {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const propertyId = req.path.split('/').pop();
    if (!propertyId) {
      res.status(400).json({ error: 'Property ID required' });
      return;
    }

    const { platform, icalUrl, isEnabled, syncFrequency } = req.body;

    // Validate iCal URL if provided
    if (icalUrl && !validateICalUrl(icalUrl)) {
      res.status(400).json({ error: 'Invalid iCal URL. Must be HTTPS and end with .ics' });
      return;
    }

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (platform !== undefined) updateData.platform = platform;
    if (icalUrl !== undefined) updateData.icalUrl = icalUrl;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (syncFrequency !== undefined) updateData.syncFrequency = syncFrequency;

    await db.collection('calendar_syncs').doc(propertyId).update(updateData);

    const updated = await db.collection('calendar_syncs').doc(propertyId).get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (error: any) {
    console.error('Failed to update calendar sync', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete calendar sync
 * DELETE /api/v1/calendar-syncs/:propertyId
 */
export const deleteCalendarSync = onRequest(async (req, res) => {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const propertyId = req.path.split('/').pop();
    if (!propertyId) {
      res.status(400).json({ error: 'Property ID required' });
      return;
    }

    await db.collection('calendar_syncs').doc(propertyId).delete();
    res.json({ success: true, message: 'Calendar sync deleted' });
  } catch (error: any) {
    console.error('Failed to delete calendar sync', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger manual sync
 * POST /api/v1/calendar-syncs/:propertyId/sync
 */
export const triggerSync = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const propertyId = req.path.split('/')[req.path.split('/').length - 2];
    if (!propertyId) {
      res.status(400).json({ error: 'Property ID required' });
      return;
    }

    // Perform sync
    const result = await syncCalendar(propertyId);

    // Log sync result
    const now = new Date().toISOString();
    await db.collection('calendar_sync_logs').add({
      propertyId,
      status: result.success ? 'SUCCESS' : 'FAILED',
      eventsImported: result.eventsImported,
      eventsSkipped: result.eventsSkipped,
      errorMessage: result.error || null,
      syncDuration: result.duration,
      createdAt: now,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Failed to trigger sync', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scheduled sync - runs every 30 minutes
 */
export const scheduledCalendarSync = onSchedule('*/30 * * * *', async (event) => {
  console.log('Starting scheduled calendar sync...');

  try {
    // Get all enabled calendar syncs
    const snapshot = await db.collection('calendar_syncs')
      .where('isEnabled', '==', true)
      .get();

    if (snapshot.empty) {
      console.log('No enabled calendar syncs found');
      return;
    }

    console.log(`Found ${snapshot.size} calendar syncs to process`);

    // Process syncs in batches of 5
    const batchSize = 5;
    const syncs = snapshot.docs;
    let totalImported = 0;
    let totalFailed = 0;

    for (let i = 0; i < syncs.length; i += batchSize) {
      const batch = syncs.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (doc) => {
          const propertyId = doc.id;
          console.log(`Syncing property: ${propertyId}`);
          
          const result = await syncCalendar(propertyId);

          // Log the result
          const now = new Date().toISOString();
          await db.collection('calendar_sync_logs').add({
            propertyId,
            status: result.success ? 'SUCCESS' : 'FAILED',
            eventsImported: result.eventsImported,
            eventsSkipped: result.eventsSkipped,
            errorMessage: result.error || null,
            syncDuration: result.duration,
            createdAt: now,
          });

          return result;
        }),
      );

      // Count successes and failures
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          totalImported += result.value.eventsImported;
        } else {
          totalFailed++;
        }
      });
    }

    console.log(`Scheduled sync completed: ${totalImported} events imported, ${totalFailed} failed`);
  } catch (error: any) {
    console.error('Scheduled sync failed', error);
  }
});
