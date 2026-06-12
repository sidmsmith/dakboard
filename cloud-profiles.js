// Cloud profile backup/sync (Neon via /api/profiles)
(function () {
  const DEVICE_ID_KEY = 'dakboard-device-id';
  const DEVICE_LABEL_KEY = 'dakboard-device-label';
  const LAST_AUTO_ATTEMPT_KEY = 'dakboard-last-auto-backup-attempt';
  const LAST_CURRENT_SYNC_KEY = 'dakboard-last-current-sync';
  const SETUP_AUTO_CLOSE_MS = 5000;
  const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const AUTO_BACKUP_POLL_MS = 60 * 60 * 1000;
  const CURRENT_SYNC_INTERVAL_MS = 15 * 60 * 1000;

  const PRESERVE_KEYS = new Set([
    DEVICE_ID_KEY,
    DEVICE_LABEL_KEY,
    LAST_AUTO_ATTEMPT_KEY,
    LAST_CURRENT_SYNC_KEY,
    'dakboard-authenticated',
    'dakboard-password'
  ]);

  function isCloudEnabled() {
    return window.dakboardAuth && window.dakboardAuth.isAuthenticated();
  }

  function getPassword() {
    return window.dakboardAuth && window.dakboardAuth.getPassword();
  }

  function getProfilesApiUrl() {
    return '/api/profiles';
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  function getDeviceLabel() {
    const saved = localStorage.getItem(DEVICE_LABEL_KEY);
    if (saved) return saved;
    const label = (navigator.platform || 'device').slice(0, 40);
    localStorage.setItem(DEVICE_LABEL_KEY, label);
    return label;
  }

  async function profilesFetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Dakboard-Password': getPassword(),
      ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function hasExistingDakboardConfig() {
    if (localStorage.getItem('dakboard-total-pages') !== null) {
      return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('dakboard-')) continue;
      if (PRESERVE_KEYS.has(key)) continue;
      if (key.startsWith('dakboard-page-')) return true;
      if (key.startsWith('dakboard-widget-')) return true;
      if (key === 'dakboard-edit-mode') return true;
      if (key === 'dakboard-current-page') return true;
    }
    return false;
  }

  function clearDakboardLocalConfig() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('dakboard-') && !PRESERVE_KEYS.has(key)) {
        keysToRemove.push(key);
      }
      if (key.startsWith('whiteboard-')) keysToRemove.push(key);
      if (key.startsWith('dakboard-annotation')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  function formatSavedAt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function showSetupModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cloud-setup-overlay';
      overlay.id = 'cloud-setup-overlay';

      let remaining = Math.ceil(SETUP_AUTO_CLOSE_MS / 1000);
      let autoTimer = null;
      let countdownTimer = null;
      let resolved = false;

      function finish(action) {
        if (resolved) return;
        resolved = true;
        clearTimeout(autoTimer);
        clearInterval(countdownTimer);
        overlay.remove();
        resolve(action);
      }

      overlay.innerHTML = `
        <div class="cloud-setup-dialog" role="dialog" aria-modal="true">
          <h2>Welcome to Dakboard</h2>
          <p class="cloud-setup-subtitle">No local configuration found on this device.</p>
          <div class="cloud-setup-actions">
            <button type="button" class="cloud-setup-btn primary" id="setup-import-cloud">
              Import from cloud
            </button>
            <button type="button" class="cloud-setup-btn" id="setup-start-new">Start new dashboard</button>
          </div>
          <p class="cloud-setup-countdown" id="setup-countdown">
            Starting fresh in <strong>${remaining}</strong>s…
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      countdownTimer = setInterval(() => {
        remaining -= 1;
        const el = document.getElementById('setup-countdown');
        if (el) {
          el.innerHTML = remaining > 0
            ? `Starting fresh in <strong>${remaining}</strong>s…`
            : 'Starting fresh…';
        }
      }, 1000);

      autoTimer = setTimeout(() => finish('start-new'), SETUP_AUTO_CLOSE_MS);

      overlay.querySelector('#setup-start-new').addEventListener('click', () => finish('start-new'));

      overlay.querySelector('#setup-import-cloud').addEventListener('click', () => finish('import-cloud'));
    });
  }

  async function showCloudImportPicker() {
    const profiles = await listProfilesForImport();
    if (!profiles.length) {
      alert('No cloud profiles found.');
      return null;
    }

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cloud-setup-overlay';

      const options = profiles.map((p) => {
        const label = p.profile_type === 'auto'
          ? `${p.name || 'Auto backup'} — ${formatSavedAt(p.saved_at)}`
          : `${p.name} — ${formatSavedAt(p.saved_at)}`;
        return `<option value="${p.id}">${label.replace(/</g, '&lt;')}</option>`;
      }).join('');

      overlay.innerHTML = `
        <div class="cloud-setup-dialog" role="dialog" aria-modal="true">
          <h2>Import from cloud</h2>
          <label class="cloud-import-label" for="cloud-profile-select">Choose a profile</label>
          <select id="cloud-profile-select" class="cloud-profile-select">${options}</select>
          <p class="cloud-setup-subtitle">Import Pages replaces your current pages. Add Pages appends after them.</p>
          <div class="cloud-setup-actions">
            <button type="button" class="cloud-setup-btn primary" id="cloud-import-replace">Import Pages</button>
            <button type="button" class="cloud-setup-btn" id="cloud-import-append">Add Pages</button>
            <button type="button" class="cloud-setup-btn" id="cloud-import-cancel">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const finish = (mode) => {
        const id = overlay.querySelector('#cloud-profile-select').value;
        overlay.remove();
        resolve(mode ? { profileId: id, mode } : null);
      };

      overlay.querySelector('#cloud-import-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('#cloud-import-replace').addEventListener('click', () => finish('replace'));
      overlay.querySelector('#cloud-import-append').addEventListener('click', () => finish('append'));
    });
  }

  async function listProfilesForImport() {
    const data = await profilesFetch(`${getProfilesApiUrl()}?type=manual`);
    const manual = data.profiles || [];
    const autoData = await profilesFetch(`${getProfilesApiUrl()}?type=auto`);
    const auto = autoData.profiles || [];
    return [...manual, ...auto].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
  }

  async function fetchProfileConfig(profileId) {
    const data = await profilesFetch(`${getProfilesApiUrl()}?id=${encodeURIComponent(profileId)}`);
    return data.config;
  }

  async function importProfileById(profileId, mode = 'replace') {
    const config = await fetchProfileConfig(profileId);
    if (!config || !config.pages) {
      throw new Error('Profile has no configuration data');
    }
    if (typeof window.applyImportedConfig !== 'function') {
      throw new Error('Import handler not available');
    }
    await window.applyImportedConfig(config, { mode, reload: true });
  }

  async function saveManualProfile(name, pageIndices) {
    if (!isCloudEnabled()) {
      return;
    }
    if (typeof window.buildExportConfig !== 'function') {
      throw new Error('Export builder not available');
    }
    const config = window.buildExportConfig(pageIndices);
    const result = await profilesFetch(getProfilesApiUrl(), {
      method: 'POST',
      body: JSON.stringify({
        profile_type: 'manual',
        name,
        config,
        device_id: getDeviceId(),
        device_label: getDeviceLabel()
      })
    });
    if (typeof showToast === 'function') {
      showToast(`Saved "${name}" to cloud`, 2500);
    }
    return result;
  }

  async function saveAutoBackup() {
    if (!isCloudEnabled() || typeof window.buildExportConfig !== 'function') {
      return { skipped: true, reason: 'disabled' };
    }

    localStorage.setItem(LAST_AUTO_ATTEMPT_KEY, new Date().toISOString());

    const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    const pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    const config = window.buildExportConfig(pageIndices);

    return profilesFetch(getProfilesApiUrl(), {
      method: 'POST',
      body: JSON.stringify({
        profile_type: 'auto',
        config,
        device_id: getDeviceId(),
        device_label: getDeviceLabel()
      })
    });
  }

  async function syncCurrentProfile() {
    if (!isCloudEnabled() || typeof window.buildExportConfig !== 'function') {
      return;
    }
    const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    const pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    const config = window.buildExportConfig(pageIndices);

    await profilesFetch(getProfilesApiUrl(), {
      method: 'POST',
      body: JSON.stringify({
        profile_type: 'current',
        config,
        device_id: getDeviceId(),
        device_label: getDeviceLabel()
      })
    });

    localStorage.setItem(LAST_CURRENT_SYNC_KEY, new Date().toISOString());
  }

  function shouldAttemptAutoBackup() {
    const last = localStorage.getItem(LAST_AUTO_ATTEMPT_KEY);
    if (!last) return true;
    return Date.now() - new Date(last).getTime() >= AUTO_BACKUP_INTERVAL_MS;
  }

  function startBackgroundSync() {
    if (!isCloudEnabled()) return;

    if (shouldAttemptAutoBackup()) {
      saveAutoBackup().catch((err) => console.warn('Auto-backup failed:', err));
    }

    setInterval(() => {
      if (shouldAttemptAutoBackup()) {
        saveAutoBackup().catch((err) => console.warn('Auto-backup failed:', err));
      }
    }, AUTO_BACKUP_POLL_MS);

    setInterval(() => {
      syncCurrentProfile().catch((err) => console.warn('Current sync failed:', err));
    }, CURRENT_SYNC_INTERVAL_MS);
  }

  async function resolveCloudStartup() {
    getDeviceId();

    if (hasExistingDakboardConfig()) {
      startBackgroundSync();
      return;
    }

    const action = await showSetupModal();

    if (action === 'start-new') {
      if (typeof window.initializeFreshDashboard === 'function') {
        window.initializeFreshDashboard();
      } else {
        localStorage.setItem('dakboard-total-pages', '1');
        localStorage.setItem('dakboard-current-page', '0');
      }
      startBackgroundSync();
      return;
    }

    if (action === 'import-cloud') {
      try {
        const selection = await showCloudImportPicker();
        if (!selection) {
          return resolveCloudStartup();
        }
        await importProfileById(selection.profileId, selection.mode);
      } catch (err) {
        console.error('Cloud import failed:', err);
        alert('Cloud import failed: ' + err.message);
        return resolveCloudStartup();
      }
    }
  }

  function promptCloudSaveName(defaultName) {
    const name = prompt('Name this cloud save:', defaultName || 'My dashboard');
    if (!name || !name.trim()) return null;
    return name.trim();
  }

  function showCloudSaveDialog() {
    const totalPages = parseInt(localStorage.getItem('dakboard-total-pages')) || 1;
    const currentPage = parseInt(localStorage.getItem('dakboard-current-page')) || 0;

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cloud-setup-overlay';

      overlay.innerHTML = `
        <div class="cloud-setup-dialog" role="dialog" aria-modal="true">
          <h2>Save to cloud</h2>
          <p class="cloud-setup-subtitle">Named saves are shared across all devices. Auto-backups run daily while the dashboard is open.</p>
          <div class="cloud-setup-actions">
            <button type="button" class="cloud-setup-btn primary" id="cloud-save-current">Current page</button>
            <button type="button" class="cloud-setup-btn primary" id="cloud-save-all">All pages (${totalPages})</button>
            <button type="button" class="cloud-setup-btn" id="cloud-save-cancel">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        resolve();
      };

      overlay.querySelector('#cloud-save-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      overlay.querySelector('#cloud-save-current').addEventListener('click', async () => {
        overlay.remove();
        await window.cloudProfiles.promptSaveToCloud([currentPage]);
        resolve();
      });

      overlay.querySelector('#cloud-save-all').addEventListener('click', async () => {
        overlay.remove();
        const allPages = Array.from({ length: totalPages }, (_, i) => i);
        await window.cloudProfiles.promptSaveToCloud(allPages);
        resolve();
      });
    });
  }

  window.resolveCloudStartup = resolveCloudStartup;
  window.cloudProfiles = {
    isEnabled: isCloudEnabled,
    saveManualProfile,
    saveAutoBackup,
    syncCurrentProfile,
    showCloudImportPicker,
    importProfileById,
    clearDakboardLocalConfig,
    resetDevice: async function resetDevice() {
      if (!confirm('Reset this device? Local dashboard data will be cleared and setup will run again.')) {
        return;
      }
      clearDakboardLocalConfig();
      window.location.reload();
    },
    promptSaveToCloud: async function promptSaveToCloud(pageIndices) {
      const name = promptCloudSaveName();
      if (!name) return;
      try {
        await saveManualProfile(name, pageIndices);
        syncCurrentProfile().catch(() => {});
      } catch (err) {
        alert('Cloud save failed: ' + err.message);
      }
    },
    openCloudSaveDialog: showCloudSaveDialog,
    openCloudImportDialog: async function openCloudImportDialog() {
      try {
        const selection = await showCloudImportPicker();
        if (!selection) return;
        await importProfileById(selection.profileId, selection.mode);
      } catch (err) {
        alert('Cloud import failed: ' + err.message);
      }
    }
  };

  function wireCloudUi() {
    const saveCloudBtn = document.getElementById('save-cloud-btn');
    if (saveCloudBtn) {
      saveCloudBtn.addEventListener('click', () => {
        window.cloudProfiles.openCloudSaveDialog();
      });
    }

    const importCloudBtn = document.getElementById('import-cloud-btn');
    if (importCloudBtn) {
      importCloudBtn.addEventListener('click', () => {
        window.cloudProfiles.openCloudImportDialog();
      });
    }

    const resetBtn = document.getElementById('reset-device-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.cloudProfiles.resetDevice();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', wireCloudUi);
})();
