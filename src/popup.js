document.addEventListener('DOMContentLoaded', () => {
    const openSidebarButton = document.getElementById('open-sidebar-button');
    const optionsButton = document.getElementById('options-button');

    openSidebarButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'open_side_panel' });
    });

    optionsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});
