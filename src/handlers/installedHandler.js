import { logging } from '../background.js';

export default async function handleInstalled() {
  console.log('Extension ready!');

  chrome.storage.sync.get('featureEnabled', (data) => {
    if (!data.featureEnabled) {
      chrome.runtime.openOptionsPage();
    }
  });

  logging();
}
