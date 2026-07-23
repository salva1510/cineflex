(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let syncTimer = null;

  function user() {
    return window.auth?.currentUser || window.currentUser || null;
  }

  function isVip() {
    try { return !!window.CineFlexMembership?.isVip?.(); }
    catch (_) { return false; }
  }

  function ensureStatus() {
    const badge = $('userBadge');
    if (!badge || $('cfAccountSyncStatus')) return;
    const status = document.createElement('div');
    status.id = 'cfAccountSyncStatus';
    status.className = 'cf-account-sync-status';
    status.setAttribute('aria-live', 'polite');
    badge.insertAdjacentElement('afterend', status);
  }

  function render(message) {
    ensureStatus();
    const status = $('cfAccountSyncStatus');
    if (!status) return;
    const u = user();

    if (message) {
      status.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><span>${message}</span>`;
      return;
    }

    if (!u) {
      status.innerHTML = '<i class="fa-solid fa-user-clock"></i><span>Guest mode • history is not saved</span>';
      return;
    }

    status.innerHTML = isVip()
      ? '<i class="fa-solid fa-cloud-check"></i><span>VIP account • cloud sync active</span>'
      : '<i class="fa-solid fa-cloud-check"></i><span>Member account • cloud sync active</span>';
  }

  async function syncNow() {
    const u = user();
    if (!u) return render();
    render('Syncing your account…');
    try {
      if (typeof window.loadUserData === 'function') await window.loadUserData();
      render('Synced just now');
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => render(), 2500);
    } catch (error) {
      console.warn('Account sync:', error);
      render('Sync will retry automatically');
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => render(), 3500);
    }
  }

  function addQuickLinks() {
    const box = $('drawerAccountActions');
    if (!box || $('cfAccountQuickLinks')) return;
    const links = document.createElement('div');
    links.id = 'cfAccountQuickLinks';
    links.className = 'cf-account-quick-links';
    links.innerHTML = `
      <button type="button" data-cf-account-action="continue"><i class="fa-solid fa-clock-rotate-left"></i><span>Continue Watching</span></button>
      <button type="button" data-cf-account-action="sync"><i class="fa-solid fa-rotate"></i><span>Sync Now</span></button>`;
    box.prepend(links);

    links.addEventListener('click', event => {
      const button = event.target.closest('[data-cf-account-action]');
      if (!button) return;
      const action = button.dataset.cfAccountAction;
      if (action === 'sync') syncNow();
      if (action === 'continue') {
        window.closeMenuDrawer?.();
        const section = $('continue-watching-section');
        if (section && section.style.display !== 'none') section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.showToast?.('No saved titles yet. Start watching a movie or episode.');
      }
    });
  }

  function onAuthChanged() {
    render();
    addQuickLinks();
    if (user()) setTimeout(syncNow, 400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureStatus();
    addQuickLinks();
    render();
  });
  window.addEventListener('cineflex-auth-state', onAuthChanged);
  window.addEventListener('cineflex-login', onAuthChanged);
  window.addEventListener('cineflex-logout', render);
  window.addEventListener('cineflex-membership-change', render);
  window.addEventListener('online', () => user() && syncNow());
})();
