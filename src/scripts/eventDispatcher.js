import {
  handleTabActivated,
  handleTabRemoved,
} from '../handlers/tabHandlers.js';
import handleIdleStateChanged from '../handlers/idleHandlers.js';
import handleRuntimeMessage from '../handlers/messageHandlers.js';

export async function registerEventListeners() {
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onRemoved.addListener(handleTabRemoved);
  chrome.idle.onStateChanged.addListener(handleIdleStateChanged);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}
