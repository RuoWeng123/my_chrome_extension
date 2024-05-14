chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'fetchLocalStorage') {
    // 获取 localStorage 数据
    let localStorageData = localStorage.getItem('cmict_chrome_extension_db');
    // 将数据发送回调用页面（content.js）
    sendResponse(localStorageData);
  }
});