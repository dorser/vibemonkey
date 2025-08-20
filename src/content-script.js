/**
 * VibeMonkey Content Script
 *
 * This script is injected into the active tab to analyze the DOM
 * and provide context to the AI. It operates on a request/response
 * model, only running when the sidepanel requests it.
 */

// --- Main Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getDomSketch') {
        // Use request.goal to make the context even more specific in the future.
        const sketch = getDomContext(request.goal);
        chrome.runtime.sendMessage({ type: 'domSketchResult', sketch: sketch });
    }
    // Return true to indicate you wish to send a response asynchronously.
    return true;
});


// --- DOM Analysis Functions ---

/**
 * Gathers a concise summary of the page's DOM structure and key elements.
 * This version is optimized to reduce the overall size of the context payload.
 * @param {string} goal - The user's stated goal, for context.
 * @returns {string} A stringified summary of the DOM.
 */
function getDomContext(goal) {
    const focusedElement = document.activeElement;

    const summary = {
        url: window.location.href,
        title: document.title,
        goal: goal, // Include the user's goal for context
        focusedElement: focusedElement ? getElementSummary(focusedElement) : 'none',
        mainLandmarks: [...document.querySelectorAll('main, [role="main"]')].map(getElementSummary),
        interactiveElements: getInteractiveSummary(),
        meta: {
            description: document.querySelector('meta[name="description"]')?.content || 'N/A',
        }
    };

    const mainLandmarksString = summary.mainLandmarks.length > 0
        ? summary.mainLandmarks.map(s => `  - ${s}`).join('\n')
        : '  - None';

    // Instead of sending a JSON object, we'll send a formatted string.
    return `Page Title: ${summary.title}
URL: ${summary.url}
User's Goal: ${summary.goal}
Focused Element: ${summary.focusedElement ? `- ${summary.focusedElement}` : '  - None'}
Main Landmarks:
${mainLandmarksString}
Interactive Elements Summary:
  - Buttons: ${summary.interactiveElements.buttons}
  - Links: ${summary.interactiveElements.links}
  - Inputs: ${summary.interactiveElements.inputs}
  - Other (select, textarea): ${summary.interactiveElements.other}
Meta Description: ${summary.meta.description}`.trim();
}

/**
 * Creates a one-line summary of a DOM element.
 * @param {HTMLElement} el
 * @returns {string} A concise string representation of the element.
 */
function getElementSummary(el) {
    if (!el) return 'N/A';
    const tagName = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    const text = el.textContent?.trim().substring(0, 50).replace(/\s+/g, ' ') || '';
    return `${tagName}${id}${classes} (Text: "${text}...")`;
}

/**
 * Provides a count of different types of interactive elements on the page.
 * @returns {{buttons: number, links: number, inputs: number, other: number}}
 */
function getInteractiveSummary() {
    return {
        buttons: document.querySelectorAll('button, [role="button"]').length,
        links: document.querySelectorAll('a[href]').length,
        inputs: document.querySelectorAll('input, [role="textbox"], [role="searchbox"]').length,
        other: document.querySelectorAll('select, textarea').length
    };
}

