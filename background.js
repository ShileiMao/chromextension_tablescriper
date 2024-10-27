chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  chrome.contextMenus.create({
    id: "scrapeTable",
    title: "Scrape Table",
    contexts: ["page"]
  });
  console.log("Context menu created");
});

function sendMessageToTab(tabId, message, retries = 5) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message:", chrome.runtime.lastError.message);
      if (retries > 0) {
        setTimeout(() => {
          sendMessageToTab(tabId, message, retries - 1);
        }, 1000);
      } else {
        console.error("Failed to send message after multiple attempts");
      }
    } else if (response && response.success === false) {
      console.error("Content script error:", response.error);
    } else {
      console.log("Message sent and response received successfully");
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked");
  if (info.menuItemId === "scrapeTable" && tab?.id) {
    console.log(`Sending message to tab ${tab.id}`);
    sendMessageToTab(tab.id, { action: "scrapeTable" });
  }
});
