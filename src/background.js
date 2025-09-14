import {
  saveEvent,
  upsertPage,
  getTotalTimeForTab,
  getTotalTimeAllTabsToday,
} from './storage.js';

let activeTabId = null;
let activeStart = null;
let userActive = true;
let collectionEnabled = true;

chrome.idle.setDetectionInterval(15);

async function updateCollectionEnabled() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('collectionFunctionEnabled', (data) => {
      collectionEnabled = !!data.collectionFunctionEnabled;
      resolve(collectionEnabled);
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension ready!');

  await updateCollectionEnabled();

  chrome.storage.sync.get('featureEnabled', (data) => {
    if (!data.featureEnabled) {
      chrome.runtime.openOptionsPage();
    }
  });

  logging();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  console.clear();

  await updateCollectionEnabled();

  if (!collectionEnabled) {
    return;
  }

  if (activeTabId !== null) {
    stopActiveTimer();
  }

  activeTabId = tabId;

  if (userActive) {
    startActiveTimer();
  }

  saveEvent({ type: 'focus_gain', tabId, ts: Date.now() });

  logging();
});

chrome.idle.onStateChanged.addListener(async (state) => {
  console.clear();

  await updateCollectionEnabled();

  if (!collectionEnabled) {
    return;
  }

  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    if (tabs && tabs[0]) {
      console.log(`Idle state for tab ${tabs[0].id}: ${state}`);
    }
  });

  if (state === 'active') {
    userActive = true;
    startActiveTimer();
  } else {
    stopActiveTimer();
    userActive = false;
  }

  logging();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!collectionEnabled) {
    return;
  }

  if (tabId === activeTabId) {
    stopActiveTimer();
  }

  saveEvent({ type: 'tab_closed', tabId, ts: Date.now() });
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  console.clear();

  await updateCollectionEnabled();

  if (!collectionEnabled) {
    return;
  }

  if (msg.type === 'page_view') {
    saveEvent({
      type: 'page_view',
      ts: Date.now(),
      page: msg.page,
    });

    upsertPage(msg.page.url, msg.page.title);
  } else if (msg.type === 'visibility_change') {
    saveEvent({
      type: 'visibility_change',
      ts: Date.now(),
      state: msg.state,
      tabId: sender?.tab?.id,
    });

    if (msg.state === 'hidden') {
      console.log('Tab is hidden');

      stopActiveTimer();
    } else if (msg.state === 'visible') {
      console.log('Tab is visible');

      activeTabId = sender?.tab?.id ?? null;

      if (userActive && activeTabId !== null) {
        startActiveTimer();
      }
    }
  }

  logging();
});

function startActiveTimer() {
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

function stopActiveTimer() {
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

export function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export function getTimePreset() {
  const interval = 1000 * 60 * 60 * 24;
  const startOfDay = Math.floor(Date.now() / interval) * interval;
  const endOfDay = startOfDay + interval - 1;

  return { startOfDay, endOfDay };
}

async function logTodayTimeForTab(tabId) {
  const { startOfDay, endOfDay } = getTimePreset();
  const totalMs = await getTotalTimeForTab(tabId, startOfDay, endOfDay);

  console.log(`Tab ${tabId} active today: ${formatTime(totalMs)}`);
}

async function logging() {
  await updateCollectionEnabled();

  if (!collectionEnabled) {
    return;
  }

  getTotalTimeAllTabsToday().then((totalMs) => {
    console.log(`Total time all tabs active today: ${formatTime(totalMs)}`);
  });

  chrome.tabs.query(
    { currentWindow: true, active: true },
    async function (tabs) {
      if (!tabs || tabs.length === 0) {
        return;
      }

      await logTodayTimeForTab(tabs[0].id);
    }
  );
}
