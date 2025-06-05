document.getElementById('summarizeBtn').addEventListener('click', () => {
    document.getElementById('statusText').textContent = "Running summarization...";
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "summarize" }, (response) => {
        if (chrome.runtime.lastError) {
          document.getElementById('statusText').textContent = "Error communicating with tab.";
          return;
        }
  
        const summaryBox = document.getElementById('summaryOutput');
        summaryBox.innerHTML = ''; // Clear previous content
  
        let goodCount = 0;
        let badCount = 0;
  
        if (response?.summary) {
          document.getElementById('statusText').textContent = "Summary ready!";
  
          const lines = response.summary.split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().startsWith("* good:")) {
              goodCount++;
              const div = document.createElement("div");
              div.className = "good";
              div.textContent = trimmed.replace(/^\*\s*GOOD:\s*/i, "");
              summaryBox.appendChild(div);
            } else if (trimmed.toLowerCase().startsWith("* bad:")) {
              badCount++;
              const div = document.createElement("div");
              div.className = "bad";
              div.textContent = trimmed.replace(/^\*\s*BAD:\s*/i, "");
              summaryBox.appendChild(div);
            }
          });
  
          // Update the GOOD/BAD bar widths
          const total = goodCount + badCount;
          const goodBar = document.getElementById("goodBar");
          const badBar = document.getElementById("badBar");
  
          if (total === 0) {
            goodBar.style.width = "0%";
            badBar.style.width = "0%";
          } else {
            const goodPct = (goodCount / total) * 100;
            const badPct = (badCount / total) * 100;
            goodBar.style.width = `${goodPct}%`;
            badBar.style.width = `${badPct}%`;
          }
  
        } else {
          document.getElementById('statusText').textContent = "No summary returned.";
        }
      });
    });
  });
  