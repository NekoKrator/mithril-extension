chrome.runtime.sendMessage({
  type: 'page_view',
  page: {
    url: location.href,
    title: document.title,
    referrer: document.referrer,
  },
});

document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'visibility_change',
    state: document.visibilityState,
  });
});

window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({
    type: 'tab_unload',
    page: {
      url: location.href,
      title: document.title,
    },
  });
});
