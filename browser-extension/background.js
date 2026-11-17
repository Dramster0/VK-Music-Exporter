chrome.action.onClicked.addListener(async tab => {
  try {
    const url = new URL(tab.url || '');
    if (url.protocol !== 'https:' || !['vk.com', 'www.vk.com', 'vk.ru', 'www.vk.ru', 'music.vk.com', 'music.vk.ru'].includes(url.hostname)) {
      await chrome.action.setBadgeText({tabId: tab.id, text: 'VK?'});
      return;
    }
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['merge.js', 'adapter.js', 'audit.js', 'csv.js', 'filename.js', 'panel.js', 'collector.js']});
    await chrome.action.setBadgeText({tabId: tab.id, text: ''});
  } catch {
    await chrome.action.setBadgeText({tabId: tab.id, text: 'ERR'});
  }
});
