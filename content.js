function getMainContentText() {
  const clonedBody = document.body.cloneNode(true);
  const footers = clonedBody.querySelectorAll('footer');
  footers.forEach(footer => footer.remove());
  return clonedBody.innerText;
}

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

function countOccurrencesForPhrases(text, phrases) {
  let totalCount = 0;
  phrases.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    totalCount += count;
    console.log(`Phrase "${phrase}" found ${count} times.`);
  });
  return totalCount;
}

function countPhraseOccurrences(text, phrase) {
  const regex = new RegExp(phrase, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function displaySummary(output) {
  // Create a container for the popup
  const container = document.createElement("div");
  container.id = "tos-summary-box";
  
  // Attach a Shadow DOM for isolation from page styles
  const shadow = container.attachShadow({ mode: 'open' });
  
  // Define our styles, header, and bullet styling
  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      height: 350px;
      background-color: #fff;
      border: 1px solid #ccc;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #fff;
      border-bottom: 1px solid #ccc;
      padding: 10px;
      font-weight: bold;
      font-size: 16px;
    }
    .close-btn {
      color: red;
      font-size: 24px;
      cursor: pointer;
    }
    .content {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .good-bullet {
      background-color: #e6f9e6; /* light green */
      padding: 8px;
      border-radius: 3px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .bad-bullet {
      background-color: #ffe6e6; /* light red */
      padding: 8px;
      border-radius: 3px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .icon {
      font-size: 18px;
      margin-right: 8px;
    }
  `;
  shadow.appendChild(style);
  
  // Create header element with title and close button
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `<span>ToS Summarization</span><span class="close-btn">✖</span>`;
  header.querySelector(".close-btn").addEventListener("click", () => {
    container.remove();
  });
  shadow.appendChild(header);
  
  // Create content container
  const content = document.createElement("div");
  content.className = "content";
  
  // Group lines manually by GOOD and BAD
  const goodBullets = [];
  const badBullets = [];
  
  const lines = output.split("\n");
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.match(/^(\*\s*)?GOOD:/i)) {
      goodBullets.push(trimmed.replace(/^(\*\s*)?GOOD:/i, "").trim());
    } else if (trimmed.match(/^(\*\s*)?BAD:/i)) {
      badBullets.push(trimmed.replace(/^(\*\s*)?BAD:/i, "").trim());
    }
  });
  
  let htmlContent = "";
  // Output each good bullet separately
  goodBullets.forEach(text => {
    htmlContent += `<p class="good-bullet"><span class="icon">👍</span>${text}</p>`;
  });
  // Output each bad bullet separately
  badBullets.forEach(text => {
    htmlContent += `<p class="bad-bullet"><span class="icon">👎</span>${text}</p>`;
  });
  
  content.innerHTML = htmlContent;
  shadow.appendChild(content);
  
  // Append the container to the document body
  document.body.appendChild(container);
}

function sendToLLAMAModel(prompt) {
  fetch("https://my-proxy-server-tos.onrender.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "meta-llama/llama-3.3-70b-instruct:free",
      "messages": [
        { "role": "user", "content": prompt }
      ],
      "temperature": 0
    })
  })
  .then(response => response.json())
  .then(data => {
    const output = data.choices && data.choices[0]
      ? data.choices[0].message.content
      : "No output";
    console.log("LLaMA model output:", output);
    if (output.trim() !== "N/A") {
      displaySummary(output);
    }
  })
  .catch(error => {
    console.error("Error communicating with LLaMA model:", error);
  });
}

// Exclude Google search pages
if (window.location.href.includes("google.com/search")) {
  console.log("This is a Google search page. Skipping summarization.");
} else {
  const mainText = getMainContentText();
  
  const agreementOccurrenceCount = countOccurrencesForPhrases(mainText, agreementKeyPhrases);
  console.log("Total agreement key phrase occurrences:", agreementOccurrenceCount);
  
  const nonAgreementOccurrenceCount = countOccurrencesForPhrases(mainText, nonAgreementKeyPhrases);
  console.log("Total non-agreement key phrase occurrences:", nonAgreementOccurrenceCount);
  
  const youAgreeCount = countPhraseOccurrences(mainText, "you agree to");
  console.log(`Phrase "you agree to" found ${youAgreeCount} times.`);
  
  // Candidate conditions:
  //   1. Agreement: agreement phrases >= 3 AND "you agree to" >= 1
  //   2. Non-agreement: non-agreement phrases >= 3
  const isAgreementCandidate = (agreementOccurrenceCount >= 3 && youAgreeCount >= 1);
  const isNonAgreementCandidate = (nonAgreementOccurrenceCount >= 3);
  
  if (isAgreementCandidate || isNonAgreementCandidate) {
    console.log("Candidate for summarization detected.");
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
    console.log("Sending prompt to LLaMA model...");
    sendToLLAMAModel(prompt);
  } else {
    console.log("Not enough key phrases detected. Skipping summarization.");
  }
}
