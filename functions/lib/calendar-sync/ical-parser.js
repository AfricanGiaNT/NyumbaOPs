"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseICalData = parseICalData;
exports.filterFutureEvents = filterFutureEvents;
exports.validateICalUrl = validateICalUrl;
const ical = __importStar(require("ical"));
/**
 * Parse iCal data and extract booking events
 */
function parseICalData(icalData) {
    try {
        const events = ical.parseICS(icalData);
        const parsedEvents = [];
        for (const key in events) {
            const event = events[key];
            // Only process VEVENT components
            if (event.type !== 'VEVENT') {
                continue;
            }
            // Skip events without required fields
            if (!event.uid || !event.start || !event.end) {
                console.warn(`Skipping event without required fields: ${event.uid}`);
                continue;
            }
            // Extract confirmation code from summary (Airbnb format)
            const confirmationCode = extractConfirmationCode(event.summary || '');
            parsedEvents.push({
                uid: event.uid,
                summary: event.summary || 'Airbnb Booking',
                startDate: new Date(event.start),
                endDate: new Date(event.end),
                description: event.description,
                confirmationCode,
            });
        }
        console.log(`Parsed ${parsedEvents.length} events from iCal data`);
        return parsedEvents;
    }
    catch (error) {
        console.error('Failed to parse iCal data', error);
        throw new Error(`iCal parsing failed: ${error.message}`);
    }
}
/**
 * Extract confirmation code from event summary
 */
function extractConfirmationCode(summary) {
    // Try to extract confirmation code from summary
    const match = summary.match(/(?:Confirmation|Code):\s*([A-Z0-9]+)/i);
    if (match) {
        return match[1];
    }
    // If no explicit confirmation code, use a portion of the summary
    const cleaned = summary.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
    return cleaned || 'AIRBNB';
}
/**
 * Filter events to only include future bookings
 */
function filterFutureEvents(events) {
    const now = new Date();
    return events.filter(event => event.endDate >= now);
}
/**
 * Validate iCal URL format
 */
function validateICalUrl(url) {
    try {
        const urlObj = new URL(url);
        // Must be HTTPS
        if (urlObj.protocol !== 'https:') {
            return false;
        }
        // Must end with .ics
        if (!urlObj.pathname.endsWith('.ics')) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
