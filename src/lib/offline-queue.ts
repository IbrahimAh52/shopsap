const DB_NAME = 'ShopSnapOfflineQueue';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

export interface QueuedUpload {
  id: string; // matches inspectionId or temporary id
  inspectionId: string;
  fileBlob: Blob;
  fileName: string;
  metadata: {
    vehicleYear: number;
    vehicleMake: string;
    vehicleModel: string;
    customerPhone: string;
    repairName: string;
    estimatedCost: number;
    urgency: 'URGENT' | 'RECOMMENDED' | 'MONITOR';
  };
  queuedAt: string;
}

// Open / initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export const offlineQueue = {
  // Add a new video to the queue
  async add(item: Omit<QueuedUpload, 'queuedAt'>): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const newItem: QueuedUpload = {
        ...item,
        queuedAt: new Date().toISOString(),
      };

      const request = store.put(newItem);
      request.onsuccess = () => {
        // Trigger a custom event to notify listeners (e.g. UI status components)
        window.dispatchEvent(new Event('offline_queue_changed'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // List all queued items
  async list(): Promise<QueuedUpload[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  },

  // Remove an item from the queue
  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        window.dispatchEvent(new Event('offline_queue_changed'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Process the queue: attempt to upload files
  async process(onProgress?: (msg: string) => void): Promise<{ successCount: number; failedCount: number }> {
    const items = await this.list();
    if (items.length === 0) return { successCount: 0, failedCount: 0 };

    let successCount = 0;
    let failedCount = 0;

    for (const item of items) {
      try {
        if (onProgress) onProgress(`Uploading inspection video for ${item.metadata.vehicleMake} ${item.metadata.vehicleModel}...`);
        
        // 1. Upload the file first
        const formData = new FormData();
        formData.append('file', item.fileBlob, item.fileName);
        formData.append('inspectionId', item.inspectionId);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload server returned error status');
        }

        const uploadData = await uploadRes.json();
        const videoUrl = uploadData.url;

        // 2. Create/Update the inspection in DB
        const dbRes = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.inspectionId,
            ...item.metadata,
            videoUrl,
            status: 'SENT', // once uploaded, it is live and "sent" (or awaiting approval)
          }),
        });

        if (!dbRes.ok) {
          throw new Error('Failed to update inspection data');
        }

        // Remove from queue on success
        await this.remove(item.id);
        successCount++;
        
        // Notify tab channel that something was sent successfully
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage_updated'));
        }

      } catch (err) {
        console.error(`Failed to process queued upload ${item.id}:`, err);
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }
};
