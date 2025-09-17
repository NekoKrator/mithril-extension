import {
  updateCollectionEnabled,
  stopActiveTimer,
  startActiveTimer,
  logging,
  setActiveTabId,
  getActiveTabId,
  isUserActive,
  isCollectionEnabled,
} from '../background.js';
import { saveEvent } from '../storage.js';

export async function handleTabActivated({ tabId }) {
  console.clear();
  await updateCollectionEnabled();

  if (!isCollectionEnabled()) return;

  if (getActiveTabId() !== null) {
    stopActiveTimer();
  }

  setActiveTabId(tabId);

  if (isUserActive()) {
    startActiveTimer();
  }

  saveEvent({ type: 'focus_gain', tabId, ts: Date.now() });
  logging();
}

export function handleTabRemoved(tabId) {
  if (!isCollectionEnabled()) return;

  if (tabId === getActiveTabId()) {
    stopActiveTimer();
  }

  saveEvent({ type: 'tab_closed', tabId, ts: Date.now() });
}
