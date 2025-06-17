chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrollToTop') {
    window.scrollTo(0, 0);
    sendResponse({ done: true });
  }
}); 