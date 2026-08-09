console.log("[ScraperX] content script loaded on", location.href);

const WORKER_URL = "https://billowing-smoke-7577.abhishektawte20.workers.dev";

// Give each detected element a unique handle so we can write back to it later.
const elementRegistry = new Map();

function clean(str) {
  return (str || "").replace(/\s+/g, " ").replace(/[:*]\s*$/, "").trim();
}

// Try several label conventions in priority order; first one that yields text wins.
function resolveLabel(el) {
  // 1. Explicit aria-label
  const aria = clean(el.getAttribute("aria-label"));
  if (aria) return aria;

  // 2. <label for="id">
  if (el.id) {
    const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (forLabel) {
      const t = clean(forLabel.textContent);
      if (t) return t;
    }
  }

  // 3. Previous sibling text (covers "Familiar Name" / "Former Name" style)
  const prev = clean(el.previousElementSibling?.textContent);
  if (prev && prev.length < 60) return prev;

  // 4. Wrapping .input__label > .mr_5 (covers "Start Date" style)
  const inputLabel = el.closest("label, .input__label")?.querySelector(".mr_5");
  if (inputLabel) {
    const t = clean(inputLabel.textContent);
    if (t) return t;
  }

  // 5. block_* ancestor header (covers Vue "Full Description" style)
  const block = el.closest("[id^='block_']");
  if (block) {
    const t = clean(block.querySelector(".item-header__info .typography")?.textContent);
    if (t) return t;
  }

  // 6. Placeholder as a last resort
  const ph = clean(el.getAttribute("placeholder"));
  if (ph) return ph;

  return null;
}

function detectFields() {
  elementRegistry.clear();
  const fields = [];
  const seen = new Set();

  const els = document.querySelectorAll(
    "input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, select"
  );

  els.forEach((el, i) => {
    if (el.disabled || el.readOnly) return;
    if (el.offsetParent === null) return; // not visible

    const label = resolveLabel(el);
    if (!label) return;
    if (seen.has(label)) return; // avoid ambiguous duplicates
    seen.add(label);

    const handle = `scraperx_${i}`;
    elementRegistry.set(handle, el);
    fields.push({ name: label, handle, current: el.value || "" });
  });

  console.log("[ScraperX] detected fields:", fields);
  return fields;
}

// Read clipboard text
async function readClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error("[ScraperX] clipboard read failed:", err);
    return null;
  }
}

// Call Worker to get AI mapping
async function getMapping(clipboardText, fields) {
  const fieldNames = fields.map((f) => f.name);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clipboardText,
        fields: fieldNames,
      }),
    });

    if (!response.ok) {
      console.error("[ScraperX] Worker error:", response.status);
      return null;
    }

    const result = await response.json();
    console.log("[ScraperX] Worker returned:", result);
    return result.data || null;
  } catch (err) {
    console.error("[ScraperX] fetch error:", err);
    return null;
  }
}

// Show review overlay
function showReviewOverlay(fields, mapping) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "scraperx-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
    background: white;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  let html = "<h2 style='margin-top: 0;'>ScraperX AutoFill</h2>";
  html += "<p>Review the mapped values. Unchecked fields are skipped.</p>";

  const matched = fields.filter((f) => mapping[f.name] != null && mapping[f.name] !== "");

  if (matched.length === 0) {
    html += "<p><em>No values could be mapped from the clipboard.</em></p>";
  }

  matched.forEach((field) => {
    const value = String(mapping[field.name]);
    html += `
      <div style='margin-bottom: 12px;'>
        <label style='display: block; font-weight: bold; margin-bottom: 4px;'>${field.name}</label>
        <input type='text' data-handle='${field.handle}'
          style='width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;' />
        <label style='display: inline-flex; align-items: center; margin-top: 4px; font-weight: normal;'>
          <input type='checkbox' data-check='${field.handle}' checked style='margin-right: 6px;' />
          Include this field
        </label>
      </div>
    `;
  });

  html += `
    <div style='margin-top: 20px; display: flex; gap: 10px;'>
      <button id='scraperx-apply-all' style='flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;'>Apply All</button>
      <button id='scraperx-cancel' style='flex: 1; padding: 10px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;'>Cancel</button>
    </div>
  `;

  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // Assign values as properties, not markup, so quotes in data can't break the HTML.
  matched.forEach((field) => {
    const input = overlay.querySelector(`[data-handle="${field.handle}"]`);
    if (input) input.value = String(mapping[field.name]);
  });

  return { overlay, matched };
}

// Set a value in a way React and Vue both notice.
function setValue(el, value) {
  const proto =
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : el.tagName === "SELECT"
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyValues(edits) {
  let filled = 0;
  edits.forEach(({ handle, value, name }) => {
    const el = elementRegistry.get(handle);
    if (!el) {
      console.warn(`[ScraperX] element gone for ${name}`);
      return;
    }
    setValue(el, value);
    filled++;
    console.log(`[ScraperX] filled ${name}`);
  });
  console.log(`[ScraperX] applied ${filled} field(s)`);
}

async function runAutofill() {
  console.log("[ScraperX] trigger fired");

  document.getElementById("scraperx-overlay")?.remove();

  const fields = detectFields();
  if (fields.length === 0) {
    alert("[ScraperX] No fillable fields detected on this page.");
    return;
  }

  const clipboardText = await readClipboard();
  if (!clipboardText) {
    alert("[ScraperX] Could not read the clipboard. Click on the page, then try again.");
    return;
  }

  console.log("[ScraperX] clipboard length:", clipboardText.length);

  const mapping = await getMapping(clipboardText, fields);
  if (!mapping) {
    alert("[ScraperX] The AI mapping request failed. Check the console for details.");
    return;
  }

  const { overlay } = showReviewOverlay(fields, mapping);

  overlay.querySelector("#scraperx-apply-all").addEventListener("click", () => {
    const edits = [];
    overlay.querySelectorAll("[data-check]:checked").forEach((cb) => {
      const handle = cb.dataset.check;
      const input = overlay.querySelector(`[data-handle="${handle}"]`);
      const field = fields.find((f) => f.handle === handle);
      if (input && field) {
        edits.push({ handle, value: input.value, name: field.name });
      }
    });
    applyValues(edits);
    overlay.remove();
  });

  overlay.querySelector("#scraperx-cancel").addEventListener("click", () => {
    overlay.remove();
  });
}

// Respond synchronously, then do the async work — avoids the
// "message channel closed before a response was received" error.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "SCRAPERX_TRIGGER") return;
  sendResponse({ ok: true });
  runAutofill();
});
