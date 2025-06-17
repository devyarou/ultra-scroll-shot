document.getElementById('captureBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'スクリーンショットを撮影中...';

  try {
    // 現在のタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // スクリーンショットを撮影
    const screenshot = await chrome.tabs.captureVisibleTab();

    // ダウンロード用のリンクを作成
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    
    // リンクをクリックしてダウンロード
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    statusDiv.textContent = 'スクリーンショットを保存しました！';
  } catch (error) {
    statusDiv.textContent = 'エラーが発生しました: ' + error.message;
  }
});

document.getElementById('fullCaptureBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'ページ全体のスクリーンショットを撮影中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // まずcontent scriptを注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // スクロールトップのメッセージを送信
    await chrome.tabs.sendMessage(tab.id, { action: 'scrollToTop' });

    // ページ全体キャプチャをリクエスト
    chrome.runtime.sendMessage({ action: 'captureFullPage', tabId: tab.id }, async (response) => {
      if (response.error) {
        statusDiv.textContent = 'エラーが発生しました: ' + response.error;
        return;
      }

      if (response && response.images && response.images.length > 0) {
        try {
          for (let i = 0; i < response.images.length; i++) {
            const link = document.createElement('a');
            link.href = response.images[i];
            link.download = `full_screenshot_${i + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // ダウンロードの間に少し待機
            await new Promise(r => setTimeout(r, 100));
          }
          statusDiv.textContent = `${response.images.length}枚のスクリーンショットを保存しました！`;
        } catch (error) {
          statusDiv.textContent = '画像の保存中にエラーが発生しました: ' + error.message;
        }
      } else {
        statusDiv.textContent = '画像の取得に失敗しました。';
      }
    });
  } catch (error) {
    statusDiv.textContent = 'エラーが発生しました: ' + error.message;
  }
});

document.getElementById('fullCaptureSingleBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'ページ全体を1枚の画像で保存中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'scrollToTop' });

    chrome.runtime.sendMessage({ action: 'captureFullPage', tabId: tab.id }, async (response) => {
      if (response.error) {
        statusDiv.textContent = 'エラーが発生しました: ' + response.error;
        return;
      }
      if (response && response.images && response.images.length > 0) {
        try {
          // 画像をcanvasで結合
          const images = response.images;
          const loadedImages = await Promise.all(images.map(src => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          })));
          const width = loadedImages[0].width;
          const height = loadedImages.reduce((sum, img) => sum + img.height, 0);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let y = 0;
          for (const img of loadedImages) {
            ctx.drawImage(img, 0, y);
            y += img.height;
          }
          canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `full_screenshot_merged.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            statusDiv.textContent = 'ページ全体を1枚の画像で保存しました！';
          }, 'image/png');
        } catch (error) {
          statusDiv.textContent = '画像の結合中にエラーが発生しました: ' + error.message;
        }
      } else {
        statusDiv.textContent = '画像の取得に失敗しました。';
      }
    });
  } catch (error) {
    statusDiv.textContent = 'エラーが発生しました: ' + error.message;
  }
}); 