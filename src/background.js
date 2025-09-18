import {
  saveEvent,
  upsertPage,
  getTotalTimeForTab,
  getTotalTimeAllTabsToday,
  getStatistic,
} from './storage.js';
import { formatTime, getTimePreset } from './utils/time.js';
import { registerEventListeners } from './scripts/eventDispatcher.js';
import handleInstalled from './handlers/installedHandler.js';

let activeTabId = null;
let activeStart = null;
let userActive = true;
let collectionEnabled = true;

chrome.idle.setDetectionInterval(15);

chrome.runtime.onInstalled.addListener(handleInstalled);

(async () => {
  await updateCollectionEnabled().then(() => {
    registerEventListeners();
  });
})();

export async function updateCollectionEnabled() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('collectionFunctionEnabled', (data) => {
      collectionEnabled = !!data.collectionFunctionEnabled;
      resolve(collectionEnabled);
    });
  });
}

export function setActiveTabId(id) {
  activeTabId = id;
}

export function getActiveTabId() {
  return activeTabId;
}

export function setUserActive(value) {
  userActive = value;
}

export function isUserActive() {
  return userActive;
}

export function isCollectionEnabled() {
  return collectionEnabled;
}

export function startActiveTimer() {
  if (
    !collectionEnabled ||
    !userActive ||
    activeTabId === null ||
    activeStart
  ) {
    return;
  }

  activeStart = Date.now();
}

export function stopActiveTimer() {
  if (!collectionEnabled || !activeStart || activeTabId === null) {
    return;
  }

  const timeDifference = Date.now() - activeStart;

  console.log(`You were active for ${formatTime(timeDifference)}`);

  saveEvent({
    type: 'active_time',
    tabId: activeTabId,
    ts: Date.now(),
    active_time_ms: timeDifference,
    userActive,
  });

  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError) return;
    if (tab && tab.url) {
      upsertPage(tab.url, tab.title, timeDifference);
    }
  });

  activeStart = null;
}

async function logTodayTimeForTab(tabId) {
  const { startOfDay, endOfDay } = getTimePreset();
  const totalMs = await getTotalTimeForTab(tabId, startOfDay, endOfDay);

  console.log(`Tab ${tabId} active today: ${formatTime(totalMs)}`);
}

export async function logging() {
  await updateCollectionEnabled();

  if (!collectionEnabled) return;

  getTotalTimeAllTabsToday().then((totalMs) => {
    console.log(`Total time all tabs active today: ${formatTime(totalMs)}`);
  });

  chrome.tabs.query(
    { currentWindow: true, active: true },
    async function (tabs) {
      if (!tabs || tabs.length === 0) return;

      const { startOfDay, endOfDay } = getTimePreset();
      await getStatistic(tabs[0].id, startOfDay, endOfDay).then((stat) =>
        console.dir(stat)
      );

      await logTodayTimeForTab(tabs[0].id);
    }
  );
}
