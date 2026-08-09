chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "trigger-autofill") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.log("[ScraperX] no active tab");
    return;
  }

  console.log("[ScraperX] hotkey fired, sending to tab:", tab.url);

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SCRAPERX_TRIGGER" });
  } catch (err) {
    console.log("[ScraperX] content script not ready:", err.message);
  }
});
