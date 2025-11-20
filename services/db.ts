import { PhotoEntry } from "../types";

const DB_NAME = "FaceGuessingDB";
const STORE_NAME = "session";
const VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const saveSession = async (photos: PhotoEntry[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  
  // Clear old session first for this simple implementation
  await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
  });

  // Storing files in IDB can be heavy, but for <10 images it's acceptable
  // We strip out the previewUrl (blob url) as it's not persistent
  const promises = photos.map(p => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { previewUrl, ...dataToStore } = p; 
      return new Promise((resolve, reject) => {
          const req = store.add(dataToStore);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
      });
  });

  await Promise.all(promises);
};

export const clearSession = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
};