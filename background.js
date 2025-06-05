chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      const rule = {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: "terms" } }),
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: "tos" } }),
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: "terms-of-service" } })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      };
      chrome.declarativeContent.onPageChanged.addRules([rule]);
    });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightAction" && sender.tab) {
      const tabId = sender.tab.id;
      chrome.action.setBadgeText({ text: "ToS", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId });
      chrome.action.setTitle({ title: "Terms of Service detected", tabId });
      sendResponse({ result: "Badge set" });
    }
  });