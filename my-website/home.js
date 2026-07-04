// ======================================
// CINEFLEX HOME ENGINE v5.0 FIX
// ======================================

// SAFE GLOBAL STATE
let trendingItems = [];
let currentBannerIndex = 0;
let currentItem = null;
let isInitDone = false;

// ======================================
// SAFE INIT WRAPPER
// ======================================

window.addEventListener("DOMContentLoaded", () => {
    initApp();
});

// fallback (important fix for slow Firebase load)
window.addEventListener("load", () => {
    setTimeout(() => {
        if (!isInitDone) {
            console.warn("⚠️ fallback init triggered");
            initApp();
        }
    }, 1500);
});

// ======================================
// MAIN INIT
// ======================================

async function initApp() {

    if (isInitDone) return;
    isInitDone = true;

    try {

        console.log("🚀 Cineflex Init Starting...");

        await loadTMDB();

        hideSkeleton();

        observeImages();

        setupAutoBanner();

        console.log("✅ Cineflex Loaded Successfully");

    } catch (err) {

        console.error("❌ Init Error:", err);

    }
}

// ======================================
// TMDB LOAD (FIXED PARALLEL SAFE)
// ======================================

async function loadTMDB() {

    try {

        const [
            trd,
            marvel,
            anime,
            fil,
            kd,
            kp,
            kids,
            pinoyAction,
            cocomelon,
            netflixMovies,
            dramabox
        ] = await Promise.all([
            fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_companies=420&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?with_genres=16&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?region=PH&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?with_original_language=ko&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_genres=10402&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_genres=16,10751&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?region=PH&with_genres=28&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?with_genres=16,10751&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?with_watch_providers=8&watch_region=PH&api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?with_genres=18&api_key=${API_KEY}`).then(r => r.json())
        ]);

        trendingItems = trd?.results || [];

        if (trendingItems.length > 0) {
            setBanner(trendingItems[0]);
        }

        renderSection("trending-today", trd);
        renderSection("marvel-list", marvel);
        renderSection("anime-list", anime);
        renderSection("filipino-list", fil);
        renderSection("kdrama-list", kd);
        renderSection("kpop-list", kp);
        renderSection("kids-list", kids);
        renderSection("pinoy-action-list", pinoyAction);
        renderSection("cocomelon-list", cocomelon);
        renderSection("netflix-movies-list", netflixMovies);
        renderSection("dramabox-list", dramabox);

        if (typeof updateContinueUI === "function") {
            updateContinueUI();
        }

    } catch (err) {
        console.error("TMDB Load Error:", err);
    }
}

// ======================================
// SAFE SECTION RENDER
// ======================================

function renderSection(id, data) {

    const el = document.getElementById(id);
    if (!el) return;

    const items = data?.results || [];

    if (!items.length) {
        el.innerHTML = `<div style="color:#888;padding:10px;">No data</div>`;
        return;
    }

    el.innerHTML = items
        .filter(i => i.poster_path)
        .map(item => `
            <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}" loading="lazy">
            </div>
        `).join('');
}

// ======================================
// BANNER FIX
// ======================================

function setBanner(item) {

    const banner = document.getElementById("banner");
    const title = document.getElementById("banner-title");
    const desc = document.getElementById("banner-desc");

    if (!banner || !item) return;

    banner.style.backgroundImage =
        `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;

    if (title) title.innerText = item.title || item.name || "Untitled";

    if (desc) {
        desc.innerText =
            (item.overview || "").substring(0, 120) + "...";
    }
}

// ======================================
// SKELETON FIX
// ======================================

function hideSkeleton() {

    document.querySelectorAll(".skeleton").forEach(el => {
        el.remove();
    });

}

// ======================================
// IMAGE OBSERVER FIX
// ======================================

function observeImages() {

    const imgs = document.querySelectorAll("img");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add("loaded");
            }
        });
    });

    imgs.forEach(img => observer.observe(img));
}

// ======================================
// AUTO BANNER FIX
// ======================================

function setupAutoBanner() {

    setInterval(() => {

        if (trendingItems.length > 1) {
            currentBannerIndex =
                (currentBannerIndex + 1) %
                trendingItems.length;

            setBanner(trendingItems[currentBannerIndex]);
        }

    }, 8000);
}

// ======================================
// ERROR SAFETY
// ======================================

window.addEventListener("error", (e) => {
    console.error("JS Error Caught:", e.message);
});

console.log("🔥 Cineflex Home Engine v5 FIX loaded");
