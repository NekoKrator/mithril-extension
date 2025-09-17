import {
  updateCollectionEnabled,
  startActiveTimer,
  stopActiveTimer,
  logging,
  setUserActive,
  isCollectionEnabled,
} from '../background.js';

export default async function handleIdleStateChanged(state) {
  console.clear();
  await updateCollectionEnabled();

  if (!isCollectionEnabled()) return;

  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    if (tabs && tabs[0]) {
      console.log(`Idle state for tab ${tabs[0].id}: ${state}`);
    }
  });

  if (state === 'active') {
    chrome.runtime.sendMessage({ type: 'activity', state: 'active' });
    setUserActive(true);
    startActiveTimer();
  } else {
    chrome.runtime.sendMessage({ type: 'activity', state: 'idle' });
    stopActiveTimer();
    setUserActive(false);
  }

  logging();
}
