document.addEventListener('DOMContentLoaded', function () {
  const featureEnabledCheckbox = document.getElementById('featureEnabled');
  const statusDiv = document.getElementById('status');
  const saveButton = document.getElementById('save');

  const idleThreshold = document.getElementById('idleThreshold');
  const saveidleThresholdBtn = document.getElementById('btn-idle');
  const idleTimeStatus = document.getElementById('idleTimeStatus');

  chrome.storage.sync.get({ featureEnabled: false }, function (data) {
    featureEnabledCheckbox.checked = data.featureEnabled;
  });

  chrome.storage.sync.get({ idleThreshold }, function (data) {
    idleTimeStatus.textContent = data.idleThreshold;
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

  saveidleThresholdBtn.addEventListener('click', function () {
    const idleTime = idleThreshold.value;
    chrome.storage.sync.set({ idleThreshold: idleTime });
  });
});
