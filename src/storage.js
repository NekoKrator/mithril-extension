const dbName = 'ActivityAnalyticsDB';
const dbVersion = 3;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      reject(event.target.errorCode);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('eventStore')) {
        const store = db.createObjectStore('eventStore', {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex('tabId', 'tabId', { unique: false });
        store.createIndex('ts', 'ts', { unique: false });
      }

      if (!db.objectStoreNames.contains('pagesStore')) {
        const store = db.createObjectStore('pagesStore', { keyPath: 'pageId' });

        store.createIndex('url', 'url', { unique: true });
      }
    };
  });
}

export async function saveEvent(event) {
  const db = await openDatabase();
  const tx = db.transaction(['eventStore'], 'readwrite');
  tx.objectStore('eventStore').add(event);
}

export async function upsertPage(url, title, deltaTime = 0) {
  const db = await openDatabase();
  const tx = db.transaction(['pagesStore'], 'readwrite');
  const store = tx.objectStore('pagesStore');
  const index = store.index('url');
  const req = index.get(url);

  req.onsuccess = () => {
    const existing = req.result;

    if (existing) {
      existing.totalActiveTime = (existing.totalActiveTime || 0) + deltaTime;
      existing.lastSeen = Date.now();
      store.put(existing);
    } else {
      store.add({
        pageId: crypto.randomUUID(),
        url,
        title,
        totalActiveTime: deltaTime,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  };
}

export async function getTotalTimeForTab(tabId, startTs, endTs) {
  const db = await openDatabase();

  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readonly');
    const store = tx.objectStore('eventStore');
    const req = store.getAll();

    req.onsuccess = () => {
      const totalMs = req.result
        .filter(
          (e) =>
            e.type === 'active_time' &&
            e.tabId === tabId &&
            e.ts >= startTs &&
            e.ts <= endTs &&
            e.userActive !== false
        )
        .reduce((sum, e) => sum + (e.active_time_ms || 0), 0);

      resolve(totalMs);
    };
  });
}

export async function getTotalTimeAllTabsToday() {
  const db = await openDatabase();

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readonly');
    const store = tx.objectStore('eventStore');
    const req = store.getAll();

    req.onsuccess = () => {
      const totalMs = req.result
        .filter(
          (e) =>
            e.type === 'active_time' &&
            e.ts >= startOfDay &&
            e.ts <= endOfDay &&
            e.userActive !== false
        )
        .reduce((sum, e) => sum + (e.active_time_ms || 0), 0);

      resolve(totalMs);
    };
  });
}

export async function clearData() {
  const db = await openDatabase();
  const tx = db.transaction(['eventStore'], 'readwrite');
  const store = tx.objectStore('eventStore');
  const req = store.clear();

  req.onsuccess = function () {
    console.log(`Object store cleared.`);
  };

  req.onerror = function (event) {
    console.error(`Error clearing object store:`, event.target.error);
  };

  tx.oncomplete = function () {
    db.close();
  };

  req.onsuccess = () => {
    console.log('Data was deleted');
  };
}

export async function getAllEvents() {
  const db = await openDatabase();

  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readonly');
    const store = tx.objectStore('eventStore');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}
