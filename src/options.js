document.addEventListener('DOMContentLoaded', function () {
  const featureEnabledCheckbox = document.getElementById('featureEnabled');
  const statusDiv = document.getElementById('status');
  const saveButton = document.getElementById('save');

  chrome.storage.sync.get({ featureEnabled: false }, function (data) {
    featureEnabledCheckbox.checked = data.featureEnabled;
  });

  saveButton.addEventListener('click', function () {
    const isFeatureEnabled = featureEnabledCheckbox.checked;
    chrome.storage.sync.set({ featureEnabled: isFeatureEnabled }, function () {
      statusDiv.textContent = 'Options saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
        window.close();
      }, 1500);
    });
  });
});
