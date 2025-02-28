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
  const container = document.createElement("div");
  container.id = "tos-summary-box";
  
  const shadow = container.attachShadow({ mode: 'open' });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      overflow-y: auto;
      background: #fff;
      border: 1px solid #ccc;
      padding: 15px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      border-radius: 4px;
    }
    p {
      margin: 10px 0;
    }
    .good {
      color: green;
      font-size: 18px;
      vertical-align: middle;
      margin-right: 5px;
    }
    .bad {
      color: red;
      font-size: 18px;
      vertical-align: middle;
      margin-right: 5px;
    }
  `;
  shadow.appendChild(style);
  

  const content = document.createElement("div");
  let htmlContent = "";
  
 
  const lines = output.split("\n");
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("GOOD:")) {
      const text = trimmed.replace("GOOD:", "").trim();
      htmlContent += `<p><span class="good">👍</span>${text}</p>`;
    } else if (trimmed.startsWith("BAD:")) {
      const text = trimmed.replace("BAD:", "").trim();
      htmlContent += `<p><span class="bad">👎</span>${text}</p>`;
    } else if (trimmed.length > 0) {
      htmlContent += `<p>${trimmed}</p>`;
    }
  });
  
  content.innerHTML = htmlContent;
  shadow.appendChild(content);
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
        {
          "role": "user",
          "content": prompt
        }
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
  
First, determine if this text represents a dedicated Terms of Service, User Agreement, Privacy Policy, or similar legal document. 
If it is not, simply respond with "N/A" and nothing else, no additional text. 
If it is, separate the beneficial/good parts of the ToS with the potentially detrimental/dangerous aspects, putting "GOOD:" in front of each good bullet point and "BAD:" in front of each bad bullet point. Keep ONLY the most important bullet points, not unnecessary additional information. Keep each bullet point succinct yet accurate and highlight the key points and important clauses. Make the language simple to understand but still indicative of the terms. Do not add any other text besides the good and the bad bullets.
    `;
    
    console.log("Sending prompt to LLaMA model...");
    sendToLLAMAModel(prompt);
  } else {
    console.log("Not enough key phrases detected. Skipping summarization.");
  }
}
