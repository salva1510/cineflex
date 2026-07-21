/* CineFlex Signature Experience v1.0 */
(() => {
  'use strict';
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();

  ready(() => {
    document.body.insertAdjacentHTML('afterbegin', '<div class="cf-noise" aria-hidden="true"></div><div class="cf-cursor-glow" aria-hidden="true"></div>');
    const glow = document.querySelector('.cf-cursor-glow');
    if (glow && matchMedia('(pointer:fine)').matches) {
      document.addEventListener('pointermove', (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      }, {passive:true});
    }

    const dock = document.querySelector('.cf-discovery-dock');
    dock?.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-target]');
      if (!chip) return;
      dock.querySelectorAll('.cf-dock-chip').forEach(btn => btn.classList.remove('active'));
      chip.classList.add('active');
      document.querySelector(chip.dataset.target)?.scrollIntoView({behavior:'smooth', block:'start'});
    });

    const labels = ['Fresh Pick','CineFlex Pick','Fan Favorite','Tonight','Must Watch'];
    const decorateCards = (root = document) => {
      root.querySelectorAll('.card:not(.view-all-card), .netflix-item-container:not(.view-all-card)').forEach((card) => {
        if (card.dataset.signatureReady) return;
        card.dataset.signatureReady = '1';
        const index = Array.from(card.parentElement?.children || []).indexOf(card);
        const label = labels[Math.abs(index) % labels.length];
        card.insertAdjacentHTML('beforeend', `<span class="cf-card-mark"><i class="fa-solid fa-sparkles"></i>${label}</span>${index < 3 ? '<span class="cf-card-pulse" aria-hidden="true"></span>' : ''}`);
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${((e.clientX-r.left)/r.width)*100}%`);
          card.style.setProperty('--my', `${((e.clientY-r.top)/r.height)*100}%`);
        }, {passive:true});
      });
    };

    decorateCards();
    const observer = new MutationObserver((records) => records.forEach(r => r.addedNodes.forEach(n => n.nodeType === 1 && decorateCards(n))));
    observer.observe(document.body, {childList:true, subtree:true});

    document.querySelectorAll('.row h2').forEach((h2) => {
      if (!h2.title) h2.title = 'Swipe or scroll to explore';
    });
  });
})();
