// Household password gate — prompt once per browser/device, then remember in localStorage
(function () {
  const AUTH_FLAG_KEY = 'dakboard-authenticated';
  const PASSWORD_KEY = 'dakboard-password';

  if (localStorage.getItem(AUTH_FLAG_KEY) !== 'true') {
    document.documentElement.classList.add('dakboard-auth-pending');
  }

  function isAuthenticated() {
    return localStorage.getItem(AUTH_FLAG_KEY) === 'true'
      && Boolean(localStorage.getItem(PASSWORD_KEY));
  }

  function unlockDashboard() {
    document.documentElement.classList.remove('dakboard-auth-pending');
    document.body.classList.add('dakboard-authenticated');
  }

  function markAuthenticated(password) {
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    localStorage.setItem(PASSWORD_KEY, password);
    unlockDashboard();
  }

  function getPassword() {
    return localStorage.getItem(PASSWORD_KEY);
  }

  async function verifyPassword(password) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Incorrect password');
    }
    return true;
  }

  function showPasswordModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cloud-setup-overlay dakboard-auth-overlay';
      overlay.id = 'dakboard-auth-overlay';

      overlay.innerHTML = `
        <div class="cloud-setup-dialog" role="dialog" aria-modal="true">
          <h2>Enter password</h2>
          <p class="cloud-setup-subtitle">This dashboard is private. Enter the household password to continue.</p>
          <form id="dakboard-auth-form" class="dakboard-auth-form">
            <input
              type="password"
              id="dakboard-auth-input"
              class="cloud-profile-select dakboard-auth-input"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
            <p id="dakboard-auth-error" class="dakboard-auth-error" hidden></p>
            <button type="submit" class="cloud-setup-btn primary" id="dakboard-auth-submit">Continue</button>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      const form = overlay.querySelector('#dakboard-auth-form');
      const input = overlay.querySelector('#dakboard-auth-input');
      const errorEl = overlay.querySelector('#dakboard-auth-error');
      const submitBtn = overlay.querySelector('#dakboard-auth-submit');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = input.value.trim();
        if (!password) return;

        errorEl.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking…';

        try {
          await verifyPassword(password);
          markAuthenticated(password);
          overlay.remove();
          resolve();
        } catch (err) {
          errorEl.textContent = err.message || 'Incorrect password';
          errorEl.hidden = false;
          input.value = '';
          input.focus();
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Continue';
        }
      });

      input.focus();
    });
  }

  async function resolveDeviceAuth() {
    if (isAuthenticated()) {
      unlockDashboard();
      return;
    }

    await showPasswordModal();
  }

  window.resolveDeviceAuth = resolveDeviceAuth;
  window.dakboardAuth = {
    isAuthenticated,
    getPassword
  };
})();
