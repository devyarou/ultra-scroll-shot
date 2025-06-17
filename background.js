chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    console.log('captureFullPage start');
    (async () => {
      try {
        const tabId = request.tabId;
        const results = [];
        let finished = false;

        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => { window.scrollTo(0, 0); }
        });
        await new Promise(r => setTimeout(r, 1000));

        while (!finished) {
          const response = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              return {
                scrollY: window.scrollY,
                innerHeight: window.innerHeight,
                scrollHeight: Math.max(
                  document.body.scrollHeight,
                  document.documentElement.scrollHeight,
                  document.body.offsetHeight,
                  document.documentElement.offsetHeight
                )
              };
            }
          });

          const { scrollY, innerHeight, scrollHeight } = response[0].result;
          const isBottom = scrollY + innerHeight >= scrollHeight - 10;

          let image;
          try {
            image = await chrome.tabs.captureVisibleTab(null, {
              format: 'png',
              quality: 100
            });
          } catch (error) {
            console.log('captureVisibleTab error:', error);
            sendResponse({ error: error.message });
            return;
          }

          if (image) {
            results.push(image);
          } else {
            sendResponse({ error: 'Failed to capture screenshot' });
            return;
          }

          if (isBottom) {
            finished = true;
          } else {
            await chrome.scripting.executeScript({
              target: { tabId },
              func: () => { window.scrollBy(0, window.innerHeight); }
            });
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        console.log('captureFullPage end', results.length);
        sendResponse({ images: results });
      } catch (error) {
        console.log('captureFullPage catch error:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // 非同期でsendResponseを使うため
  }
}); 