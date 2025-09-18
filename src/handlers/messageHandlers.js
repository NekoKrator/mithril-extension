import { saveEvent, upsertPage } from '../storage.js';
import {
  startActiveTimer,
  stopActiveTimer,
  logging,
  isCollectionEnabled,
  setActiveTabId,
  isUserActive,
  getActiveTabId,
} from '../background.js';

let userActive;
let activeTabId;

export default async function handleRuntimeMessage(event, sender) {
  console.clear();

  userActive = isUserActive();
  activeTabId = getActiveTabId();

  if (!isCollectionEnabled()) return;

  switch (event.type) {
    case 'page_view':
      saveEvent({
        type: 'page_view',
        ts: Date.now(),
        url: event.page.url,
        title: event.page.title,
      });

      upsertPage(event.page.url, event.page.title);

      break;
    case 'visibility_change':
      saveEvent({
        type: 'visibility_change',
        ts: Date.now(),
        state: event.state,
        tabId: sender?.tab?.id,
      });

      if (event.state === 'hidden') {
        console.log('Tab is hidden');

        stopActiveTimer();
      } else if (event.state === 'visible') {
        console.log('Tab is visible');

        setActiveTabId(sender?.tab?.id ?? null);

        if (userActive && activeTabId !== null) {
          startActiveTimer();
        }
      }

      break;
    case 'scroll_depth_%':
      console.log(event);

      saveEvent({
        type: 'scroll_depth_%',
        ts: Date.now(),
        percent: Math.min(event.value, 100),
        tabId: sender?.tab?.id ?? null,
      });

      break;
    case 'click':
      console.log(event);

      saveEvent({
        type: 'click',
        ts: Date.now(),
        tag: event.tag,
        tagId: event.id || null,
        classes: event.classes || null,
        x: event.x,
        y: event.y,
        tabId: sender?.tab?.id ?? null,
      });

      break;
    case 'keydown':
      console.log(event);

      saveEvent({
        type: 'keydown',
        ts: Date.now(),
        tabId: sender?.tab?.id ?? null,
      });

      break;
  }

  logging();
}
