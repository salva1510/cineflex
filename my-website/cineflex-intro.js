
(() => {
  "use strict";

  const CONFIG = {
    sound: "./cineflex-intro.mp3",
    logo: "./cineflex-logo.png",
    duration: 3200,
    hardTimeout: 5000,
    storageKey: "cineflex_intro_seen_session"
  };

  // One intro per browser/app session. Remove this block to play on every page reload.
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
        radial-gradient(circle at 50% 43%, rgba(0,229,255,.15), transparent 32%),
        radial-gradient(circle at 70% 70%, rgba(100,55,255,.12), transparent 28%),
        #02050b;
      opacity: 1;
      transition: opacity .65s ease, visibility .65s ease;
      font-family: Arial, Helvetica, sans-serif;
    }

    #cineflexIntro.cf-hide {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #cineflexIntro .cf-scan {
      position: absolute;
      inset: -25%;
      background: linear-gradient(
        115deg,
        transparent 42%,
        rgba(102,245,255,.13) 48%,
        rgba(102,245,255,.28) 50%,
        transparent 57%
      );
      transform: translateX(-70%);
      animation: cfScan 2.4s cubic-bezier(.2,.8,.2,1) .35s both;
    }

    #cineflexIntro .cf-stage {
      position: relative;
      width: min(78vw, 540px);
      text-align: center;
      transform: scale(.7);
      opacity: 0;
      filter: blur(18px);
      animation: cfReveal 1.05s cubic-bezier(.16,1,.3,1) .18s forwards;
    }

    #cineflexIntro .cf-logo {
      display: block;
      width: 100%;
      max-height: 70vh;
      object-fit: contain;
      filter:
        drop-shadow(0 0 16px rgba(0,229,255,.42))
        drop-shadow(0 0 45px rgba(0,119,255,.25));
      animation: cfPulse 1.5s ease-in-out 1.05s both;
    }

    #cineflexIntro .cf-line {
      width: 0;
      height: 2px;
      margin: 18px auto 0;
      background: linear-gradient(90deg, transparent, #55f6ff, #6773ff, transparent);
      box-shadow: 0 0 18px rgba(75,239,255,.8);
      animation: cfLine 1.05s ease 1.1s forwards;
    }

    #cineflexIntro .cf-label {
      margin-top: 14px;
      color: rgba(222,249,255,.88);
      font-size: clamp(10px, 2.6vw, 14px);
      font-weight: 800;
      letter-spacing: .42em;
      text-transform: uppercase;
      opacity: 0;
      animation: cfText .7s ease 1.4s forwards;
    }

    #cineflexIntro .cf-enter {
      position: absolute;
      left: 50%;
      bottom: max(34px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      min-width: 190px;
      border: 1px solid rgba(111,242,255,.36);
      border-radius: 999px;
      padding: 13px 21px;
      background: rgba(3,12,25,.72);
      color: #eaffff;
      font: 800 12px/1 Arial, sans-serif;
      letter-spacing: .16em;
      text-transform: uppercase;
      backdrop-filter: blur(14px);
      box-shadow: 0 0 30px rgba(0,217,255,.16);
      opacity: 0;
      pointer-events: none;
      transition: opacity .25s ease;
    }

    #cineflexIntro.cf-needs-tap .cf-enter {
      opacity: 1;
      pointer-events: auto;
    }

    @keyframes cfReveal {
      to { transform: scale(1); opacity: 1; filter: blur(0); }
    }

    @keyframes cfPulse {
      0% { transform: scale(.96); filter: brightness(.7) drop-shadow(0 0 4px #00d9ff); }
      45% { transform: scale(1.025); filter: brightness(1.28) drop-shadow(0 0 32px #00d9ff); }
      100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 15px rgba(0,217,255,.55)); }
    }

    @keyframes cfScan {
      to { transform: translateX(70%); }
    }

    @keyframes cfLine {
      to { width: 82%; }
    }

    @keyframes cfText {
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      #cineflexIntro *, #cineflexIntro *::before, #cineflexIntro *::after {
        animation-duration: .01ms !important;
        animation-delay: 0ms !important;
      }
    }
  `;
  document.head.appendChild(style);

  const intro = document.createElement("div");
  intro.id = "cineflexIntro";
  intro.setAttribute("role", "dialog");
  intro.setAttribute("aria-label", "CineFlex intro");
  intro.innerHTML = `
    <div class="cf-scan"></div>
    <div class="cf-stage">
      <img class="cf-logo" src="${CONFIG.logo}" alt="CineFlex">
      <div class="cf-line"></div>
      <div class="cf-label">Original Streaming Experience</div>
    </div>
    <button class="cf-enter" type="button">Tap to enter CineFlex</button>
  `;
  document.body.appendChild(intro);

  const audio = new Audio(CONFIG.sound);
  audio.preload = "auto";
  audio.volume = 0.9;

  let closing = false;
  let closeTimer = null;

  function closeIntro() {
    if (closing) return;
    closing = true;
    clearTimeout(closeTimer);
    clearTimeout(hardCloseTimer);
    try { audio.pause(); } catch (_) {}
    intro.classList.add("cf-hide");
    window.setTimeout(() => intro.remove(), 750);
  }

  function scheduleClose(delay = CONFIG.duration) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeIntro, delay);
  }

  // Safety watchdog: the intro must never block the homepage forever,
  // even when Android/PWA audio playback is denied or hangs.
  const hardCloseTimer = setTimeout(closeIntro, CONFIG.hardTimeout);
  window.addEventListener("load", () => scheduleClose(Math.min(CONFIG.duration, 2600)), { once: true });

  async function startSound() {
    try {
      audio.currentTime = 0;
      await audio.play();
      intro.classList.remove("cf-needs-tap");
      scheduleClose();
      return true;
    } catch (error) {
      intro.classList.add("cf-needs-tap");
      return false;
    }
  }

  // Desktop may allow it. Android Chrome/PWA usually requires the first tap.
  startSound();

  const unlock = async () => {
    // A user gesture should always enter the homepage immediately.
    // Sound is attempted, but it is never allowed to keep the splash open.
    try { await startSound(); } catch (_) {}
    closeIntro();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };

  intro.querySelector(".cf-enter").addEventListener("click", unlock);
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock);

  audio.addEventListener("ended", () => {
    setTimeout(closeIntro, 200);
  });

  // Skip with double tap or Escape.
  let lastTap = 0;
  intro.addEventListener("pointerup", () => {
    const now = Date.now();
    if (now - lastTap < 350) closeIntro();
    lastTap = now;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeIntro();
  });
})();
