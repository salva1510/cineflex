(() => {
  "use strict";

  const CONFIG = {
    sound: "./cineflex-intro.mp3?v=3034",
    logo: "./cineflex-cf-splash.png?v=3034",
    duration: 4200,
    storageKey: "cineflex_cf_intro_seen_3034"
  };

  if (sessionStorage.getItem(CONFIG.storageKey) === "1") return;
  sessionStorage.setItem(CONFIG.storageKey, "1");

  const style = document.createElement("style");
  style.textContent = `
    #cineflexIntro {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 43%, rgba(218,0,20,.22), transparent 34%),
        radial-gradient(circle at 50% 100%, rgba(95,0,8,.22), transparent 42%),
        #020203;
      color: #fff;
      opacity: 1;
      visibility: visible;
      transition: opacity .68s ease, visibility .68s ease;
      font-family: Inter, Arial, Helvetica, sans-serif;
      isolation: isolate;
    }
    #cineflexIntro::before {
      content: "";
      position: absolute;
      inset: -30%;
      background: conic-gradient(from 190deg, transparent 0 44%, rgba(255,20,38,.1) 49%, transparent 54% 100%);
      animation: cfSplashAtmosphere 5s linear infinite;
      pointer-events: none;
    }
    #cineflexIntro.cf-hide { opacity: 0; visibility: hidden; pointer-events: none; }
    #cineflexIntro .cf-splash-shell {
      position: relative;
      width: min(88vw, 620px);
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translateY(8px) scale(.82);
      opacity: 0;
      filter: blur(12px);
      animation: cfSplashReveal .9s cubic-bezier(.16,1,.3,1) .06s forwards;
    }
    #cineflexIntro .cf-logo-wrap {
      position: relative;
      width: min(74vw, 430px);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
    }
    #cineflexIntro .cf-logo-wrap::before,
    #cineflexIntro .cf-logo-wrap::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }
    #cineflexIntro .cf-logo-wrap::before {
      inset: 4.5%;
      border: 2px solid rgba(255,255,255,.12);
      border-top-color: #fff;
      border-right-color: #ff1b2f;
      border-bottom-color: rgba(229,9,20,.2);
      box-shadow: 0 0 18px rgba(229,9,20,.55), inset 0 0 18px rgba(229,9,20,.16);
      animation: cfRingSpin 2.2s linear infinite;
    }
    #cineflexIntro .cf-logo-wrap::after {
      inset: 0;
      background: radial-gradient(circle, transparent 48%, rgba(229,9,20,.12) 59%, transparent 70%);
      animation: cfHaloPulse 1.55s ease-in-out infinite;
    }
    #cineflexIntro .cf-logo {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      border-radius: 50%;
      filter: drop-shadow(0 0 14px rgba(255,255,255,.18)) drop-shadow(0 0 34px rgba(229,9,20,.55));
      animation: cfLogoFloat 2.4s ease-in-out infinite;
      -webkit-user-drag: none;
      user-select: none;
    }
    #cineflexIntro .cf-loading-title {
      margin-top: clamp(-8px, -1vw, 0px);
      font-size: clamp(11px, 2.7vw, 14px);
      font-weight: 800;
      letter-spacing: .48em;
      text-transform: uppercase;
      color: rgba(255,255,255,.9);
      text-shadow: 0 0 12px rgba(255,255,255,.2);
    }
    #cineflexIntro .cf-progress-track {
      position: relative;
      width: min(72vw, 380px);
      height: 7px;
      margin-top: 17px;
      overflow: hidden;
      border: 1px solid rgba(255,48,65,.75);
      border-radius: 999px;
      background: rgba(32,0,4,.86);
      box-shadow: 0 0 18px rgba(229,9,20,.28), inset 0 0 10px rgba(0,0,0,.9);
    }
    #cineflexIntro .cf-progress-fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #8e000d 0%, #e50914 55%, #ff6571 90%, #fff 100%);
      box-shadow: 0 0 16px rgba(255,22,42,.9);
      transition: width .18s linear;
    }
    #cineflexIntro .cf-progress-fill::after {
      content: "";
      position: absolute;
      top: -4px;
      bottom: -4px;
      width: 45px;
      right: -12px;
      background: radial-gradient(circle, rgba(255,255,255,.95), rgba(255,65,80,.5) 32%, transparent 68%);
      filter: blur(1px);
    }
    #cineflexIntro .cf-percent {
      margin-top: 12px;
      color: #ff5260;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: .18em;
      text-shadow: 0 0 14px rgba(229,9,20,.7);
    }
    #cineflexIntro .cf-sound-hint {
      position: absolute;
      left: 50%;
      bottom: max(22px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      padding: 10px 16px;
      background: rgba(8,8,10,.64);
      color: rgba(255,255,255,.68);
      font: 700 10px/1 Inter, Arial, sans-serif;
      letter-spacing: .1em;
      text-transform: uppercase;
      opacity: 0;
      pointer-events: none;
      transition: opacity .25s ease;
      backdrop-filter: blur(12px);
      white-space: nowrap;
    }
    #cineflexIntro.cf-needs-tap .cf-sound-hint { opacity: 1; pointer-events: auto; }
    @keyframes cfSplashReveal { to { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); } }
    @keyframes cfRingSpin { to { transform: rotate(360deg); } }
    @keyframes cfHaloPulse { 0%,100% { opacity:.55; transform:scale(.97); } 50% { opacity:1; transform:scale(1.035); } }
    @keyframes cfLogoFloat { 0%,100% { transform:translateY(0) scale(.985); } 50% { transform:translateY(-5px) scale(1.01); } }
    @keyframes cfSplashAtmosphere { to { transform: rotate(360deg); } }
    @media (max-height: 620px) {
      #cineflexIntro .cf-logo-wrap { width: min(58vh, 330px); }
      #cineflexIntro .cf-loading-title { margin-top: -10px; }
      #cineflexIntro .cf-progress-track { margin-top: 11px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #cineflexIntro *, #cineflexIntro *::before, #cineflexIntro *::after { animation-duration: .01ms !important; animation-delay: 0ms !important; }
    }
  `;
  document.head.appendChild(style);

  const intro = document.createElement("div");
  intro.id = "cineflexIntro";
  intro.setAttribute("role", "status");
  intro.setAttribute("aria-label", "CineFlex is loading");
  intro.innerHTML = `
    <div class="cf-splash-shell">
      <div class="cf-logo-wrap"><img class="cf-logo" src="${CONFIG.logo}" alt="CF CineFlex logo"></div>
      <div class="cf-loading-title">Loading</div>
      <div class="cf-progress-track" aria-hidden="true"><div class="cf-progress-fill"></div></div>
      <div class="cf-percent">0%</div>
    </div>
    <button class="cf-sound-hint" type="button">Tap for intro sound</button>
  `;
  document.body.appendChild(intro);

  const fill = intro.querySelector(".cf-progress-fill");
  const percent = intro.querySelector(".cf-percent");
  const soundHint = intro.querySelector(".cf-sound-hint");
  const audio = new Audio(CONFIG.sound);
  audio.preload = "auto";
  audio.volume = 0.9;

  let closing = false;
  const start = performance.now();
  function tick(now) {
    if (closing) return;
    const elapsed = now - start;
    const raw = Math.min(1, elapsed / (CONFIG.duration - 500));
    const eased = 1 - Math.pow(1 - raw, 2.25);
    const value = Math.min(100, Math.round(eased * 100));
    fill.style.width = `${value}%`;
    percent.textContent = `${value}%`;
    if (raw < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function closeIntro() {
    if (closing) return;
    closing = true;
    fill.style.width = "100%";
    percent.textContent = "100%";
    window.setTimeout(() => {
      intro.classList.add("cf-hide");
      window.setTimeout(() => { intro.remove(); style.remove(); }, 760);
    }, 180);
  }

  // Always continue into the app, even when mobile/PWA blocks autoplay audio.
  const fallbackTimer = window.setTimeout(closeIntro, CONFIG.duration);

  async function playSound() {
    try {
      audio.currentTime = 0;
      await audio.play();
      intro.classList.remove("cf-needs-tap");
      return true;
    } catch (_) {
      intro.classList.add("cf-needs-tap");
      return false;
    }
  }
  playSound();

  const unlock = async () => {
    const played = await playSound();
    if (played) {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    }
  };
  soundHint.addEventListener("click", unlock);
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock);

  window.addEventListener("load", () => {
    // Do not vanish instantly; keep the premium reveal visible for at least 2.4 seconds.
    const elapsed = performance.now() - start;
    if (elapsed >= 2400) {
      clearTimeout(fallbackTimer);
      window.setTimeout(closeIntro, 350);
    }
  }, { once: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeIntro();
  });
})();
