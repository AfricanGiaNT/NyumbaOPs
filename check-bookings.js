const admin = require('./functions/node_modules/firebase-admin');

// Initialize with emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'nyumbaops' });

const db = admin.firestore();

async function checkBookings() {
  try {
    const propertyId = 'n7vOikW5ofCmu1hTXB3y';
    
    console.log('\n=== Checking bookings for property:', propertyId, '===\n');
    
    const snapshot = await db.collection('bookings')
      .where('propertyId', '==', propertyId)
      .where('status', 'in', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
      .get();
    
    console.log('Total active bookings:', snapshot.size);
    
    const now = Date.now();
    const STALE_PENDING_MS = 30 * 60 * 1000;
    
    snapshot.forEach(doc => {
      const d = doc.data();
      const created = d.createdAt ? new Date(d.createdAt).getTime() : 0;
      const ageMinutes = Math.floor((now - created) / 60000);
      const isStale = d.status === 'PENDING' && d.paymentStatus === 'UNPAID' && (now - created) > STALE_PENDING_MS;
      
      console.log('\nBooking ID:', doc.id);
      console.log('  Status:', d.status);
      console.log('  Payment:', d.paymentStatus);
      console.log('  Check-in:', d.checkInDate);
      console.log('  Check-out:', d.checkOutDate);
      console.log('  Age (minutes):', ageMinutes);
      console.log('  Is Stale?:', isStale);
      console.log('  Should be filtered?:', isStale ? 'YES - will not block dates' : 'NO - will block dates');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkBookings();
