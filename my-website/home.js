/* ===== ORIGINAL home.js CONTENT ===== */

" + Path("/mnt/data/home.js").read_text() + "

/* ========================= NETFLIX-STYLE PATCHES ========================= */

// LOGIN POPUP CONTROLS function openLoginPopup() { const popup = document.getElementById("loginPopup"); if (popup) popup.style.display = "flex"; }

function closeLoginPopup() { const popup = document.getElementById("loginPopup"); if (popup) popup.style.display = "none"; }

// SMART MENU SCROLL function scrollToSection(id) { const el = document.getElementById(id); if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "start" }); if (typeof closeMenu === "function") closeMenu(); }

// AUTO CLOSE POPUP AFTER LOGIN if (typeof auth !== "undefined") { auth.onAuthStateChanged(user => { if (user) closeLoginPopup(); }); }

/* ========================= IMPORTANT PATCH NOTE ========================= */ // In your startPlayback() or play function, // REPLACE any alert-based login block with: // if (!user) { //   openLoginPopup(); //   return; // }
