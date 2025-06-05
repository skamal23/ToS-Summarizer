// content.js

/**
 * 1. Grab the page’s visible text (excluding any <footer> tags).
 */
function getMainContentText() {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("footer").forEach(el => el.remove());
  return clone.innerText;
}

/**
 * 2. Key phrases to detect if this page is a ToS/Privacy/Agreement page.
 */
const agreementKeyPhrases = [
  "terms of service",
  "terms of use",
  "terms and conditions",
  "terms & conditions",
  "user agreement"
];
const nonAgreementKeyPhrases = [
  "privacy policy",
  "cookie policy",
  "acceptable use policy"
];

/**
 * 3. Count how many times any of the phrases in `phrases` appear in `text`.
 */
function countOccurrencesForPhrases(text, phrases) {
  let total = 0;
  phrases.forEach(phrase => {
    const re = new RegExp(phrase, "gi");
    const matches = text.match(re);
    total += matches ? matches.length : 0;
  });
  return total;
}

/**
 * 4. Count how many times a single `phrase` appears in `text`.
 */
function countPhraseOccurrences(text, phrase) {
  const re = new RegExp(phrase, "gi");
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

/**
 * 5. When LLaMA returns GOOD/BAD bullets, this function builds a fixed,
 *    360 px-wide popup in the top-right that uses YOUR popup.css.
 */
function displaySummary(llmOutput) {
  // 5.1. Create a host <div> that we’ll position fixed in the page.
  const hostDiv = document.createElement("div");
  hostDiv.style.position = "fixed";
  hostDiv.style.top = "20px";
  hostDiv.style.right = "20px";
  hostDiv.style.zIndex = "10000";
  document.body.appendChild(hostDiv);

  // 5.2. Attach a Shadow DOM to isolate the CSS.
  const shadow = hostDiv.attachShadow({ mode: "open" });

  // 5.3. Inject a <link> to load your popup.css inside the Shadow DOM.
  //      This is CRUCIAL: it ensures all of popup.css’s rules apply.
  const linkElem = document.createElement("link");
  linkElem.rel = "stylesheet";
  linkElem.href = chrome.runtime.getURL("popup.css");
  shadow.appendChild(linkElem);

  // 5.4. Create an inner <div class="popup-container">…</div>,
  //      exactly as in your original popup.html (minus the manual button/status).
  const wrapper = document.createElement("div");
  wrapper.className = "popup-container";
  // Force the same width you had in popup.css: 360px.
  wrapper.style.width = "360px";

  // 5.5. Inner HTML: same structure you used in popup.html,
  //      except remove the <button> and <p id="statusText"> because this is automatic.
  //      We also add a <span class="close-btn-overlay">✖</span> so the user can close.
  wrapper.innerHTML = `
    <div class="header">
      <img src="${chrome.runtime.getURL("logo.png")}" alt="Quick Terms logo" class="icon" />
      <h1>Quick Terms</h1>
      <div class="progress-bar">
        <div id="goodBar" class="bar good"></div>
        <div id="badBar"  class="bar bad"></div>
      </div>
    </div>

    <div id="summaryOutput"></div>

    <span class="close-btn-overlay">✖</span>
  `;
  shadow.appendChild(wrapper);

  // 5.6. Fill #summaryOutput with GOOD/BAD bullets. Ensure scrolling at 300px max-height.
  const summaryContainer = shadow.getElementById("summaryOutput");
  summaryContainer.style.maxHeight = "300px";
  summaryContainer.style.overflowY = "auto";

  const lines = llmOutput.split("\n").map(line => line.trim());
  let goodCount = 0, badCount = 0;

  lines.forEach(line => {
    if (/^\*\s*GOOD:/i.test(line)) {
      goodCount++;
      const text = line.replace(/^\*\s*GOOD:/i, "").trim();
      const bullet = document.createElement("div");
      bullet.className = "good";
      bullet.textContent = text;
      summaryContainer.appendChild(bullet);
    } else if (/^\*\s*BAD:/i.test(line)) {
      badCount++;
      const text = line.replace(/^\*\s*BAD:/i, "").trim();
      const bullet = document.createElement("div");
      bullet.className = "bad";
      bullet.textContent = text;
      summaryContainer.appendChild(bullet);
    }
  });

  // 5.7. Update progress bars, exactly as your popup.js did.
  const total = goodCount + badCount;
  const goodBar = shadow.getElementById("goodBar");
  const badBar  = shadow.getElementById("badBar");
  if (total > 0) {
    const goodPct = (goodCount / total) * 100 + "%";
    const badPct  = (badCount  / total) * 100 + "%";
    goodBar.style.width = goodPct;
    badBar.style.width  = badPct;
  } else {
    goodBar.style.width = "0%";
    badBar.style.width  = "0%";
  }

  // 5.8. Make the “✖” close button remove the overlay on click.
  const closeBtn = shadow.querySelector(".close-btn-overlay");
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "8px";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.color = "#999";
  closeBtn.addEventListener("mouseover", () => { closeBtn.style.color = "#e00"; });
  closeBtn.addEventListener("mouseout",  () => { closeBtn.style.color = "#999"; });
  closeBtn.addEventListener("click", () => { hostDiv.remove(); });
}

/**
 * 6. Send a prompt to your LLaMA proxy. If it returns anything other than “N/A,”
 *    call displaySummary(llmOutput).
 */
function sendToLLAMAModel(prompt) {
  fetch("https://my-proxy-server-tos.onrender.com/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  })
    .then(res => res.json())
    .then(data => {
      const output = data.choices?.[0]?.message?.content || "No output";
      if (output.trim() !== "N/A") {
        displaySummary(output);
      }
    })
    .catch(err => console.error("Error contacting LLaMA:", err));
}

/**
 * 7. Immediately run this detection logic at document_end. If the page looks
 *    like a ToS/Privacy/Agreement page, send a message to background (for badge)
 *    and then call LLaMA → displaySummary().
 */
(function autoDetectAndSummarize() {
  // (Optional) skip Google Search results pages
  if (window.location.href.includes("google.com/search")) return;

  // 7.1. Grab the page’s main text
  const mainText = getMainContentText();

  // 7.2. Count key phrases
  const agreementCount    = countOccurrencesForPhrases(mainText, agreementKeyPhrases);
  const nonAgreementCount = countOccurrencesForPhrases(mainText, nonAgreementKeyPhrases);
  const youAgreeCount     = countPhraseOccurrences(mainText, "you agree to");

  // 7.3. Decide if it’s a candidate ToS page
  const isAgreementCandidate    = (agreementCount >= 3 && youAgreeCount >= 1);
  const isNonAgreementCandidate = (nonAgreementCount >= 3);

  if (isAgreementCandidate || isNonAgreementCandidate) {
    // (Optional) Notify background.js to set a “ToS” badge
    chrome.runtime.sendMessage({ action: "highlightAction" });

    // 7.4. Build the same LLaMA prompt you used before
    const prompt = `
Please analyze the following text:

"${mainText}"

Determine if this text is a dedicated Terms of Service, User Agreement, Privacy Policy, or similar legal document. If it is not, simply respond with "N/A" and no additional text.

If it is, extract and summarize only the most important clauses in clear, layman's terms. Present the output using bullet points in the following exact format:

* GOOD: [Description of an important beneficial clause]
* GOOD: [Another beneficial clause]
* BAD: [Description of an important detrimental clause]
* BAD: [Another detrimental clause]

Ensure that each beneficial clause is labeled with "GOOD:" and each detrimental clause with "BAD:" — do not mix or include any extra text beyond these bullet points.
    `;
    sendToLLAMAModel(prompt);
  }
})();
