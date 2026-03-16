"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCalendar = syncCalendar;
const firebase_1 = require("../lib/firebase");
const ical_parser_1 = require("./ical-parser");
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Sync a property's calendar from iCal feed
 */
async function syncCalendar(propertyId) {
    const startTime = Date.now();
    let eventsImported = 0;
    let eventsSkipped = 0;
    let conflictsResolved = 0;
    try {
        // Get calendar sync configuration
        const calendarSyncDoc = await firebase_1.db.collection('calendar_syncs').doc(propertyId).get();
        if (!calendarSyncDoc.exists) {
            throw new Error('Calendar sync configuration not found');
        }
        const calendarSync = calendarSyncDoc.data();
        if (!calendarSync.isEnabled) {
            console.log(`Calendar sync for ${propertyId} is disabled, skipping`);
            return {
                success: true,
                eventsImported: 0,
                eventsSkipped: 0,
                conflictsResolved: 0,
                duration: Date.now() - startTime,
            };
        }
        console.log(`Syncing calendar for property: ${propertyId}`);
        // Fetch iCal data
        const icalData = await fetchICalData(calendarSync.icalUrl);
        // Parse events
        const allEvents = (0, ical_parser_1.parseICalData)(icalData);
        // Filter to only future events
        const futureEvents = (0, ical_parser_1.filterFutureEvents)(allEvents);
        console.log(`Found ${futureEvents.length} future events to process`);
        // Process each event
        for (const event of futureEvents) {
            try {
                const result = await processEvent(event, propertyId, calendarSync.platform);
                if (result.imported) {
                    eventsImported++;
                }
                else {
                    eventsSkipped++;
                }
                if (result.conflictResolved) {
                    conflictsResolved++;
                }
            }
            catch (error) {
                console.error(`Failed to process event ${event.uid}`, error);
                eventsSkipped++;
            }
        }
        // Update calendar sync status
        await firebase_1.db.collection('calendar_syncs').doc(propertyId).update({
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: 'SUCCESS',
            lastSyncError: null,
            updatedAt: new Date().toISOString(),
        });
        const duration = Date.now() - startTime;
        console.log(`Sync completed: ${eventsImported} imported, ${eventsSkipped} skipped, ${conflictsResolved} conflicts resolved (${duration}ms)`);
        return {
            success: true,
            eventsImported,
            eventsSkipped,
            conflictsResolved,
            duration,
        };
    }
    catch (error) {
        console.error('Sync failed', error);
        // Update calendar sync with error
        await firebase_1.db.collection('calendar_syncs').doc(propertyId).update({
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: 'FAILED',
            lastSyncError: error.message,
            updatedAt: new Date().toISOString(),
        });
        return {
            success: false,
            eventsImported,
            eventsSkipped,
            conflictsResolved,
            error: error.message,
            duration: Date.now() - startTime,
        };
    }
}
/**
 * Fetch iCal data from URL
 */
async function fetchICalData(url) {
    try {
        const response = await (0, node_fetch_1.default)(url, {
            headers: {
                'User-Agent': 'NyumbaOps Calendar Sync/1.0',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    }
    catch (error) {
        console.error('Failed to fetch iCal data', error);
        throw new Error(`Failed to fetch iCal feed: ${error.message}`);
    }
}
/**
 * Process a single event
 */
async function processEvent(event, propertyId, platform) {
    // Check if booking already exists (by external ID)
    const existingBookingsSnapshot = await firebase_1.db.collection('bookings')
        .where('externalId', '==', event.uid)
        .where('propertyId', '==', propertyId)
        .limit(1)
        .get();
    if (!existingBookingsSnapshot.empty) {
        const existingBooking = existingBookingsSnapshot.docs[0];
        const bookingData = existingBooking.data();
        // Update existing booking if dates changed
        const datesChanged = new Date(bookingData.checkInDate).getTime() !== event.startDate.getTime() ||
            new Date(bookingData.checkOutDate).getTime() !== event.endDate.getTime();
        if (datesChanged) {
            await existingBooking.ref.update({
                checkInDate: event.startDate.toISOString(),
                checkOutDate: event.endDate.toISOString(),
                updatedAt: new Date().toISOString(),
            });
            console.log(`Updated booking ${existingBooking.id} with new dates`);
            return { imported: true, conflictResolved: false };
        }
        // No changes needed
        return { imported: false, conflictResolved: false };
    }
    // Check for conflicts with local bookings
    const conflictResolved = await resolveConflicts(propertyId, event.startDate, event.endDate, event.uid);
    // Create or get guest
    const guestId = await getOrCreateGuest(event, platform);
    // Create new booking
    const now = new Date().toISOString();
    await firebase_1.db.collection('bookings').add({
        guestId,
        propertyId,
        status: 'CONFIRMED',
        checkInDate: event.startDate.toISOString(),
        checkOutDate: event.endDate.toISOString(),
        source: platform,
        externalId: event.uid,
        isSyncedBooking: true,
        notes: `Synced from ${platform}. ${event.description || ''}`,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created new booking from ${platform}: ${event.uid}`);
    return { imported: true, conflictResolved };
}
/**
 * Resolve conflicts with existing local bookings
 */
async function resolveConflicts(propertyId, checkInDate, checkOutDate, externalId) {
    // Find overlapping local (non-synced) bookings
    const conflictingBookingsSnapshot = await firebase_1.db.collection('bookings')
        .where('propertyId', '==', propertyId)
        .where('isSyncedBooking', '==', false)
        .get();
    const conflictingBookings = conflictingBookingsSnapshot.docs.filter(doc => {
        const booking = doc.data();
        const bookingCheckIn = new Date(booking.checkInDate);
        const bookingCheckOut = new Date(booking.checkOutDate);
        // Check for overlap and active status
        const overlaps = bookingCheckIn < checkOutDate && bookingCheckOut > checkInDate;
        const isActive = ['PENDING', 'CONFIRMED'].includes(booking.status);
        return overlaps && isActive;
    });
    if (conflictingBookings.length === 0) {
        return false;
    }
    // Cancel conflicting local bookings
    const batch = firebase_1.db.batch();
    for (const bookingDoc of conflictingBookings) {
        const booking = bookingDoc.data();
        batch.update(bookingDoc.ref, {
            status: 'CANCELLED',
            notes: `${booking.notes || ''}\n\nCANCELLED: Conflict with Airbnb booking (${externalId})`,
            updatedAt: new Date().toISOString(),
        });
        console.warn(`Cancelled local booking ${bookingDoc.id} due to Airbnb conflict`);
    }
    await batch.commit();
    return true;
}
/**
 * Get or create guest for synced booking
 */
async function getOrCreateGuest(event, platform) {
    const guestName = `Airbnb Guest - ${event.confirmationCode || event.uid.substring(0, 8)}`;
    // Try to find existing guest by name
    const existingGuestSnapshot = await firebase_1.db.collection('guests')
        .where('name', '==', guestName)
        .where('source', '==', 'AIRBNB')
        .limit(1)
        .get();
    if (!existingGuestSnapshot.empty) {
        return existingGuestSnapshot.docs[0].id;
    }
    // Create new guest
    const now = new Date().toISOString();
    const guestRef = await firebase_1.db.collection('guests').add({
        name: guestName,
        source: 'AIRBNB',
        notes: `Synced from ${platform}. Confirmation: ${event.confirmationCode || event.uid}`,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created new guest: ${guestName}`);
    return guestRef.id;
}
