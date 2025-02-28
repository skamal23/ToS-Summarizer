# ToS-Summarizer

**ToS-Summarizer** is a Chrome extension designed to help users quickly identify and understand the most important aspects of a website's Terms of Service.

## Project Goals

### 1. Automatic Detection of Terms of Service Pages
- **Detection:** Automatically recognize when the user is on a webpage that contains a Terms of Service agreement.
- **Extraction:** Once a ToS page is detected, extract the full text from the DOM.  
  *This must account for differing webpage structures, including dynamically loaded content.*

### 2. Summarization & Classification with Large Language Models (LLMs)
- **Summarization:** Evaluate LLMs (such as GPT, LLaMA, and DeepSeek) for summarizing the Terms of Service in a succinct, accurate, and user-friendly manner.
- **Classification:** Leverage LLMs to categorize sections of the Terms of Service into:
  - **Beneficial Aspects:** Elements that favor the user.
  - **Potentially Harmful Aspects:** Elements that may negatively impact the user.  
  *The goal is to identify and highlight the key points that affect users directly.*

### 3. Desired Outcomes
- **Enhanced Accessibility:** Provide digestible and accessible legal information to internet users.
- **User Empowerment:** Deliver a lightweight solution that clearly outlines user rights and data usage.
- **Automation:** Move away from traditional, crowdsourced summarization methods towards a fully automated approach.

---

Feel free to contribute, share feedback, or report any issues to help improve **ToS-Summarizer**!
