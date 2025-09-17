import { formatTime, getTimePreset } from './utils/time.js';
import {
  clearData,
  getTotalTimeAllTabsToday,
  getTotalTimeForTab,
  getAllEvents,
} from './storage.js';

function getCurrentTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      if (tabs && tabs[0]) resolve(tabs[0].id);
      else resolve(null);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.querySelector('.button__toggle');
  const toggleHelp = document.querySelector('.control__help');

  const delDataBtn = document.querySelector('.button__del');
  const getJsonDataBtn = document.querySelector('.button__get-json');
  const getCsvDataBtn = document.querySelector('.button__get-csv');

  const displayTime = document.querySelector('.display-time');
  const displayTabTime = document.querySelector('.display-tab-time');

  const activityStatus = document.querySelector('.header__status');

  async function getFeatureEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('featureEnabled', (data) => {
        resolve(!!data.featureEnabled);
      });
    });
  }

  async function getCollectionEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('collectionFunctionEnabled', (data) => {
        resolve(!!data.collectionFunctionEnabled);
      });
    });
  }

  async function setCollectionEnabled(value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ collectionFunctionEnabled: value }, resolve);
    });
  }

  async function exportCsv() {
    const data = await getAllEvents();
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      Object.values(row)
        .map((value) => {
          if (typeof value === 'string' && value.includes(', '))
            return `"${value}"`;
          return value;
        })
        .join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'events.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportJSON() {
    const data = await getAllEvents();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'events.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const isFeatureEnabled = await getFeatureEnabled();
  if (!isFeatureEnabled) {
    toggleBtn.disabled = true;
    toggleHelp.textContent = "Allow data collection - click the 'Options'!";
    return;
  }

  toggleBtn.disabled = false;

  let isCollectionEnabled = await getCollectionEnabled();
  toggleBtn.textContent = isCollectionEnabled
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

  let timestamp = new Date(totalMs);
  let timestampForTab = new Date(tabMs);

  let isRunning = isCollectionEnabled;

  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'activity' || request.type === 'visibility_change') {
      isRunning = request.state !== 'idle' && request.state !== 'hidden';

      if (request.state === 'idle') {
        activityStatus.classList.add('active');
        activityStatus.textContent = 'IDLE';
      } else if (request.state === 'active') {
        activityStatus.classList.remove('active');
        activityStatus.textContent = 'ACTIVE';
      }
    }
  });

  setInterval(() => {
    if (!isRunning) return;

    timestamp.setSeconds(timestamp.getSeconds() + 1);
    timestampForTab.setSeconds(timestampForTab.getSeconds() + 1);

    displayTime.textContent = formatTime(timestamp);
    displayTabTime.textContent =
      tabId !== null ? formatTime(timestampForTab) : '0:00:00';
  }, 1000);

  toggleBtn.addEventListener('click', async () => {
    isCollectionEnabled = await getCollectionEnabled();

    if (isCollectionEnabled) {
      await setCollectionEnabled(false);
      isRunning = false;
    } else {
      await setCollectionEnabled(true);
      isRunning = true;
    }

    toggleBtn.textContent = isRunning ? 'Stop Analytics' : 'Start Analytics';
    toggleHelp.textContent = isRunning
      ? 'Analytics are currently being collected!'
      : "Click 'Start' to begin collecting analytics!";

    if (!isCollectionEnabled) {
      activityStatus.classList.add('active');
      activityStatus.textContent = 'PAUSE';
    } else if (isCollectionEnabled) {
      activityStatus.classList.remove('active');
      activityStatus.textContent = 'ACTIVE';
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

  getJsonDataBtn.addEventListener('click', exportJSON);
  getCsvDataBtn.addEventListener('click', exportCsv);
});
