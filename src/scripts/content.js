function debounce(func, delay) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

function throttle(func, delay) {
  let last = 0;

  return (...args) => {
    const now = Date.now();

    if (now - last >= delay) {
      func(...args);
      last = now;
    }
  };
}

const handleScroll = debounce(() => {
  const element = document.documentElement;
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;

  const scrollPercent = Math.round(
    (scrollTop / (scrollHeight - clientHeight)) * 100
  );

  chrome.runtime.sendMessage({
    type: 'scroll_depth_%',
    scrollDepth: scrollPercent,
  });
}, 300);

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

document.addEventListener(
  'scroll',
  debounce(() => {
    const doc = document.documentElement;
    const percent = Math.round(
      (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100
    );
    chrome.runtime.sendMessage({ type: 'scroll_depth_%', value: percent });
  }, 300)
);

document.addEventListener(
  'click',
  throttle((e) => {
    chrome.runtime.sendMessage({
      type: 'click',
      tag: e.target.tagName,
      id: e.target.id,
      classes: e.target.className,
      x: e.clientX,
      y: e.clientY,
    });
  }, 300)
);

let keydownValue = 0;

document.addEventListener('keydown', () => {
  keydownValue++;

  chrome.runtime.sendMessage({ type: 'keydown', value: keydownValue });
});
