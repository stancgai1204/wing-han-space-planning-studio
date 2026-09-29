(() => {
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;

  const loadedVersion = document.querySelector('meta[name="app-version"]')?.content;
  if (!loadedVersion || loadedVersion === '__BUILD_SHA__') return;

  let updateVersion = null;
  let banner = null;

  function showUpdate(remoteVersion) {
    updateVersion = remoteVersion;
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'position:fixed;z-index:10000;left:50%;top:14px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;border:1px solid #7c8564;border-radius:12px;background:#f8faf3;color:#3f4937;box-shadow:0 8px 28px rgba(38,43,31,.2);font:600 13px Arial,sans-serif';
    banner.innerHTML = '<span>A newer studio update is available.</span><button type="button" style="border:0;border-radius:8px;background:#6f7855;color:white;padding:8px 12px;font:700 12px Arial,sans-serif;cursor:pointer">Reload update</button>';
    banner.querySelector('button').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('v', updateVersion.slice(0, 7));
      location.replace(url);
    });
    document.body.appendChild(banner);
  }

  async function checkForUpdate() {
    try {
      const response = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const remote = await response.json();
      if (remote.version && remote.version !== loadedVersion) showUpdate(remote.version);
    } catch (error) {
      console.debug('Update check unavailable', error);
    }
  }

  window.setTimeout(checkForUpdate, 1500);
  window.setInterval(checkForUpdate, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
})();
