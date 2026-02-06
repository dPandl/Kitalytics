
const DB_NAME = 'FileSystemDB';
const STORE_NAME = 'FileHandles';
const DB_VERSION = 1;

let db: IDBDatabase;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening IndexedDB.');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const dbInstance = await initDB();
    const transaction = dbInstance.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
}

export const get = <T>(key: IDBValidKey): Promise<T | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore('readonly');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
};

export const set = (key: IDBValidKey, value: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore('readwrite');
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const del = (key: IDBValidKey): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore('readwrite');
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};