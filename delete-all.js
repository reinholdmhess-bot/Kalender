// Skript zum Löschen aller Events in Firebase (einmalig ausführen)
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  const app = initializeApp({
    projectId: 'kalender-34096'
  });
  const db = getFirestore(app);
  
  async function deleteAll() {
    const events = await db.collection('publicEvents').get();
    console.log('Found', events.size, 'events to delete');
    for (const doc of events.docs) {
      await db.collection('publicEvents').doc(doc.id).delete();
      console.log('Deleted:', doc.id);
    }
    console.log('Done!');
    process.exit(0);
  }
  
  deleteAll().catch(console.error);
} catch(e) {
  console.error('Firebase Admin not configured. Please run: npm install -g firebase-tools && firebase login && firebase init firestore');
  process.exit(1);
}
