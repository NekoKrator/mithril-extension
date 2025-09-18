const dbName = 'ActivityAnalyticsDB';
const dbVersion = 4;

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
        store.createIndex('type', 'type', { unique: false });
      } else {
        const store = request.transaction.objectStore('eventStore');
        if (!store.indexNames.contains('type')) {
          store.createIndex('type', 'type', { unique: false });
        }
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

  tx.objectStore('eventStore').put({
    ...event,
    ts: event.ts || Date.now(),
  });
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

export async function getEventsByType(type) {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readonly');
    const store = tx.objectStore('eventStore').index('type');
    const req = store.getAll(type);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function clearOldEvents(days = 30) {
  const db = await openDatabase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readwrite');
    const store = tx.objectStore('eventStore');
    const index = store.index('ts');
    const range = IDBKeyRange.upperBound(cutoff);

    const req = index.openCursor(range);
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
  });
}

export async function clearAllEvents() {
  const db = await openDatabase();
  const tx = db.transaction(['eventStore'], 'readwrite');
  tx.objectStore('eventStore').clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
  });
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

export async function getStatistic(tabId, startTs, endTs) {
  const db = await openDatabase();

  return new Promise((resolve) => {
    const tx = db.transaction('eventStore', 'readonly');
    const store = tx.objectStore('eventStore');
    const req = store.getAll();

    req.onsuccess = () => {
      const stats = req.result.filter(
        (e) =>
          (e.type === 'scroll_depth_%' ||
            e.type === 'keydown' ||
            e.type === 'click') &&
          e.tabId === tabId &&
          e.ts >= startTs &&
          e.ts <= endTs
      );
      resolve(stats);
    };
  });
}
