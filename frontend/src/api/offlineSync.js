import { openDB } from 'idb';
import api from './client'; // Re-use the existing axios instance

const DB_NAME = 'MaceralOfflineDB';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offline_inspections')) {
        db.createObjectStore('offline_inspections', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_mines')) {
        db.createObjectStore('cached_mines', { keyPath: 'id' });
      }
    },
  });
}

// Inspects being saved while offline
export async function saveOfflineInspection(payload) {
  const db = await initDB();
  const tx = db.transaction('offline_inspections', 'readwrite');
  await tx.store.add(payload);
  await tx.done;
  console.log('Saved inspection offline.');
}

// Attempt to sync all offline inspections when back online
export async function syncOfflineInspections() {
  if (!navigator.onLine) return; // double check

  const db = await initDB();
  const tx = db.transaction('offline_inspections', 'readwrite');
  const inspections = await tx.store.getAll();

  if (inspections.length === 0) return;

  console.log(`Syncing ${inspections.length} offline inspections to backend...`);

  for (const inspection of inspections) {
    try {
      // API call to the new inspections endpoint
      await api.post('/api/inspections/', inspection);
      // If success, remove from indexedDB
      await tx.store.delete(inspection.id);
    } catch (error) {
      console.error('Failed to sync offline inspection:', error);
      // Leave it in IDB for next time
    }
  }
  await tx.done;
}

// Cache mines so the dropdown works offline
export async function cacheMinesForOffline(mines) {
  const db = await initDB();
  const tx = db.transaction('cached_mines', 'readwrite');
  for (const mine of mines) {
    await tx.store.put(mine);
  }
  await tx.done;
}

export async function getCachedMines() {
  const db = await initDB();
  return db.getAll('cached_mines');
}

// Automatically bind to the window online event
window.addEventListener('online', () => {
  console.log('App back online, attempting background sync...');
  syncOfflineInspections();
});
