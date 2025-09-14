import { formatTime, getTimePreset } from './background.js';
import {
  clearData,
  getTotalTimeAllTabsToday,
  getTotalTimeForTab,
  getAllEvents,
} from './storage.js';

function getCurrentTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      if (tabs && tabs[0]) {
        resolve(tabs[0].id);
      } else {
        resolve(null);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.querySelector('.button__toggle');
  const toggleHelp = document.querySelector('.control-help');
  const delDataBtn = document.querySelector('.button__del');
  const getDataBtn = document.querySelector('.button__get');

  const displayTime = document.querySelector('.display-time');
  const displayTabTime = document.querySelector('.display-tab-time');

  function getCollectionEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('collectionFunctionEnabled', (data) => {
        resolve(!!data.collectionFunctionEnabled);
      });
    });
  }

  function setCollectionEnabled(value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ collectionFunctionEnabled: value }, () =>
        resolve()
      );
    });
  }

  async function exportJSON() {
    const data = await getAllEvents();

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'events.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  let isCollectionEnabled = await getCollectionEnabled();

  toggleBtn.appendChild = isCollectionEnabled
    ? 'Stop Analytics'
    : 'Start Analytics';
  toggleHelp.textContent = isCollectionEnabled
    ? 'Analytics are currently being collected!'
    : "Click 'Start' to begin collecting analytics!";

  const totalMs = await getTotalTimeAllTabsToday();
  const tabId = await getCurrentTabId();

  let tabMs = 0;

  if (tabId !== null) {
    const { startOfDay, endOfDay } = getTimePreset();
    tabMs = await getTotalTimeForTab(tabId, startOfDay, endOfDay);
  }

  displayTime.textContent = formatTime(totalMs);
  displayTabTime.textContent = tabId !== null ? formatTime(tabMs) : '0:00:00';

  toggleBtn.addEventListener('click', async () => {
    isCollectionEnabled = await getCollectionEnabled();

    if (isCollectionEnabled) {
      await setCollectionEnabled(false);
      toggleBtn.textContent = 'Start Analytics';
      toggleHelp.textContent = "Click 'Start' to begin collecting analytics!";
    } else {
      await setCollectionEnabled(true);
      toggleBtn.textContent = 'Stop Analytics';
      toggleHelp.textContent = 'Analytics are currently being collected!';

      const totalMs = await getTotalTimeAllTabsToday();
      const tabId = await getCurrentTabId();
      let tabMs = 0;
      if (tabId !== null) {
        const { startOfDay, endOfDay } = getTimePreset();
        tabMs = await getTotalTimeForTab(tabId, startOfDay, endOfDay);
      }

      displayTime.textContent = formatTime(totalMs);
      displayTabTime.textContent =
        tabId !== null ? formatTime(tabMs) : '0:00:00';
    }
  });

  delDataBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all data?')) {
      await clearData();
      displayTime.textContent = '0:00:00';
      displayTabTime.textContent = '0:00:00';
      console.log('Data cleared');
    }
  });

  getDataBtn.addEventListener('click', async () => {
    exportJSON();
  });
});
