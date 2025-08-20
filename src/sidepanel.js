import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI;
let selectedModel = 'gemini-1.5-flash'; // Default model
let domSketch = null;
let generatedScript = '';

// --- Initialization and Configuration ---

function initializeApp() {
  initializeGenAI();
  // We will request the DOM sketch on demand, not on initialization.
}

function initializeGenAI() {
  chrome.storage.local.get(['apiKey', 'model'], (data) => {
    if (data.apiKey) {
      genAI = new GoogleGenerativeAI(data.apiKey);
    }
    if (data.model) {
      selectedModel = data.model;
    }
  });
}

// --- UI Element References ---
// Declare here, assign in DOMContentLoaded
let userPromptTextarea, generateButton, resultCodeElement, copyButton, saveButton;


// --- Event Handlers ---

function handleGenerateClick() {
  const userPrompt = userPromptTextarea.value;
  if (userPrompt.trim() === '') {
    resultCodeElement.textContent = 'Please describe what you want to do.';
    return;
  }

  if (!genAI) {
    resultCodeElement.textContent = 'Error: API key not set. Please set it in the extension options.';
    return;
  }

  setLoadingState(true);
  resultCodeElement.textContent = 'Getting page context...';
  document.getElementById('result-actions').classList.remove('visible');


  // 1. Set up a one-time listener for the response from the content script.
  chrome.runtime.onMessage.addListener(async function handleSketchResponse(message) {
    if (message.type === 'domSketchResult') {
      const domSketch = message.sketch;
      resultCodeElement.textContent = 'Generating script...';

      try {
        // 2. Build the prompt string with the received sketch.
        const fullPrompt = buildPrompt(userPrompt, domSketch);
        const model = genAI.getGenerativeModel({ model: selectedModel });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        generatedScript = parseScriptFromResponse(response.text());

        if (!isValidUserscript(generatedScript)) {
          throw new Error("Generated code is not a valid userscript.");
        }
        resultCodeElement.textContent = generatedScript;
        document.getElementById('result-actions').classList.add('visible');
      } catch (error) {
        console.error("Gemini API Error:", error);
        resultCodeElement.textContent = 'Error: Failed to generate script. ' + error.message;
      } finally {
        setLoadingState(false);
        // 3. Clean up the listener after it has done its job.
        chrome.runtime.onMessage.removeListener(handleSketchResponse);
      }
    }
  });

  // 4. Request the DOM sketch from the content script, passing the user's goal.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      if (tabs[0].url && (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('about:'))) {
        resultCodeElement.textContent = 'VibeMonkey cannot run on this special page.';
        setLoadingState(false);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/content-script.js'],
      }, () => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'getDomSketch', goal: userPrompt });
      });
    } else {
      resultCodeElement.textContent = 'Error: Could not find active tab.';
      setLoadingState(false);
    }
  });
}

function handleCopyClick() {
  if (generatedScript) {
    navigator.clipboard.writeText(generatedScript).then(() => {
      // Maybe show a temporary "Copied!" message
    });
  }
}

function handleSaveClick() {
  if (generatedScript) {
    const blob = new Blob([generatedScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const filename = getScriptName(generatedScript) || 'vibemonkey-script.user.js';

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }
}

// --- Helper Functions ---

function setLoadingState(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? 'Generating...' : 'Generate Script';
}

function buildPrompt(userPrompt, sketch) {
  // This function now returns a single, well-formatted string.
  const systemInstruction = `
You generate Tampermonkey/Greasemonkey userscripts that make VISUAL-ONLY changes.
Prioritize robustness, safety, idempotency, and accessibility.
Always produce:
1) A "Selector Plan" with primary and fallback CSS selectors.
2) The full, self-contained userscript code.
3) A "Post-script Checklist" to verify functionality.
Do not access local storage, cookies, or use eval/iframes.
`;

  return `
${systemInstruction.trim()}

### GOAL
${userPrompt}

### PAGE CONTEXT
${sketch}
`;
}

function parseScriptFromResponse(responseText) {
  // Find the start and end of the code block
  const start = responseText.indexOf('// ==UserScript==');
  const end = responseText.lastIndexOf('})();') + 5;

  if (start !== -1 && end !== -1 && end > start) {
    return responseText.substring(start, end);
  }
  // Fallback if the specific markers aren't found
  return responseText.trim();
}

function isValidUserscript(script) {
  return script.includes('// ==UserScript==') && script.includes('@match');
}

function getScriptName(script) {
  const match = script.match(/@name\s+(.*)/);
  if (match && match[1]) {
    return match[1].trim().replace(/\s+/g, '_') + '.user.js';
  }
  return null;
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  // Assign UI elements
  userPromptTextarea = document.getElementById('user-prompt');
  generateButton = document.getElementById('generate-button');
  resultCodeElement = document.getElementById('result-code');
  copyButton = document.getElementById('copy-button');
  saveButton = document.getElementById('save-button');

  // Attach Event Listeners
  generateButton.addEventListener('click', handleGenerateClick);
  copyButton.addEventListener('click', handleCopyClick);
  saveButton.addEventListener('click', handleSaveClick);

  // This listener is now set up inside handleGenerateClick to be a one-time listener.
  // A persistent listener is not needed here anymore.

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.apiKey || changes.model) {
        initializeGenAI();
      }
    }
  });

  // Start the app
  initializeApp();
});
