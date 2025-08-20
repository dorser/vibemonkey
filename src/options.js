const saveButton = document.getElementById('save-button');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const status = document.getElementById('status');

saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value;
    const model = modelSelect.value;
    chrome.storage.local.set({ apiKey: apiKey, model: model }, () => {
        status.textContent = 'Settings saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiKey', 'model'], (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
        if (data.model) {
            modelSelect.value = data.model;
        }
    });
});
