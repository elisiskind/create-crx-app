console.log("Started background script.");

const refreshContentScript = async () => {
  console.log("Refreshing content script");
  const contentScripts = chrome.runtime.getManifest()?.content_scripts;
  if (contentScripts) {
    await chrome.scripting.unregisterContentScripts();
    await chrome.scripting.registerContentScripts(
      contentScripts.map((cs, index) => {
        return {
          id: "content_script_" + crypto.randomUUID() + "_" + index,
          js: cs.js,
          matches: cs.matches,
          persistAcrossSessions: false,
          runAt: "document_start",
        };
      })
    );
  }
};

const addReinstallScript = async () => {
  for (const tab of await chrome.tabs.query({
    url: "https://*.google.com/*",
  })) {
    if (tab.id) {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          files: ["onReinstall.js"],
          world: "MAIN",
        })
        .catch((e) => {
          console.error("Failed to inject reinstall script", e);
        });
    }
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  new EventSource("http://localhost:8000/esbuild").addEventListener(
    "change",
    () => {
      refreshContentScript().catch();
      addReinstallScript().catch();
    }
  );
});
