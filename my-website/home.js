// ==========================================================================
// CINEFLEX CENTRAL CORE CONFIGURATION & ENGINE (ES6 Refactored)
// ==========================================================================

const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

const SERVER_1_URL = "https://zxcstream.xyz";
const SERVER_2_URL = "https://zxcstream.xyz";

// Global App States
let currentItem = null;
let trendingItems = [];
let currentBannerIndex = 0;
let currentTVState = { season: 1, episode: 1, currentEpNum: 1, type: 'movie' };
let activeServer = 1;

let continueWatching = JSON.parse(localStorage.getItem("cineflex_recent")) || [];
let watchlist = JSON.parse(localStorage.getItem("cineflex_watchlist")) || [];

let touchStartX = 0;
let touchEndX = 0;
let deferredPrompt;

// --- SAFETY REQUIRE LOGIN WRAPPER ---
// Kung wala pang idefined na requireLogin sa auth.js mo, ito ang magsisilbing salbabida para hindi mag-crash ang app.
function requireLogin(callback) {
    if (typeof auth !== 'undefined' && auth.currentUser) {
        callback();
    } else {
        alert("Mangyaring mag-login muna para mapanood ang palabas na ito.");
        if (typeof openLoginModal === 'function') openLoginModal();
    }
}

// ==========================================================================
// MODULE 1: CORE DATA FETCHING & DISCOVERY
// ==========================================================================
class CineflexCore {
    constructor() {
        this.apiCache = new Map();
        this.currentViewAllPage = 1;
        this.currentViewAllUrl = "";
        this.isFetchingViewAll = false;
    }

    async cachedFetch(url) {
        if (this.apiCache.has(url)) return this.apiCache.get(url);
        const response = await fetch(url);
        const data = await response.json();
        if (this.apiCache.size > 100) this.apiCache.clear(); // Low memory cleanup
        this.apiCache.set(url, data);
        return data;
    }

    async init() {
        try {
            const endpoints = [
                `${BASE_URL}/trending/all/day?api_key=${API_KEY}`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`,
                `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`,
                `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`,
                `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16&with_original_language=zh|ko&sort_by=popularity.desc`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`,
                `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16,10751&keywords=210024|310931|234327&sort_by=popularity.desc`
            ];

            const [trd, marvel, anime, fil, kd, kp, kids, pinoyAction, dramabox, netflixMovies, cocomelonData] = 
                await Promise.all(endpoints.map(url => this.cachedFetch(url)));

            trendingItems = trd.results;
            if (trendingItems.length > 0) this.setBanner(trendingItems[0]);
            
            this.displayCards(trd.results, "trending-today");
            this.displayCards(marvel.results, "marvel-list");
            this.displayCards(anime.results, "anime-list");
            this.displayCards(fil.results, "filipino-list");
            this.displayCards(kd.results, "kdrama-list");
            this.displayCards(kp.results, "kpop-list");
            this.displayCards(kids.results, "kids-list");
            this.displayCards(pinoyAction.results, "pinoy-action-list");
            this.displayCards(cocomelonData.results || [], "cocomelon-list");
            this.displayCards(netflixMovies.results, "netflix-movies-list");
            this.displayDramaBoxCards(dramabox.results || [], "dramabox-list");
            
            updateContinueUI();
            this.setupInfiniteScroll(); 
        } catch (err) { 
            console.error("Initialization Error:", err); 
        }
    }

    setBanner(item) {
        const banner = document.getElementById("banner");
        const bTitle = document.getElementById("banner-title");
        const bDesc = document.getElementById("banner-desc");
        if (!banner || !item) return;
        banner.style.backgroundImage = `linear-gradient(to top, var(--bg) 5%, transparent 60%), url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
        if (bTitle) bTitle.innerText = item.title || item.name;
        if (bDesc) bDesc.innerText = item.overview ? item.overview.slice(0, 120) + "..." : "";
    }

    displayCards(data, containerId) {
        const container = document.getElementById(containerId);
        if(!container || !data) return;
        
        const isNetflix = (containerId === "netflix-movies-list");
        container.innerHTML = data.filter(i => i.poster_path).map((item, index) => {
            let trendingBadge = (isNetflix && index < 10) ? `<div class="netflix-num-badge">${index + 1}</div>` : "";
            return `
            <div class="${isNetflix ? 'netflix-item-container' : 'card'}" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                ${trendingBadge}
                <img src="${IMG_URL}${item.poster_path}" loading="lazy" class="${isNetflix ? 'netflix-num-poster' : ''}">
            </div>`;
        }).join('');

        const viewAllCard = document.createElement('div');
        viewAllCard.className = isNetflix ? "netflix-item-container view-all-card" : "card view-all-card";
        viewAllCard.innerHTML = `<div style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius:6px;"><span>View All</span></div>`;
        viewAllCard.onclick = () => this.viewAll(containerId);
        container.appendChild(viewAllCard);
    }

    displayDramaBoxCards(data, containerId) {
        const container = document.getElementById(containerId);
        if(!container || !data) return;
        
        container.innerHTML = data.filter(i => i.poster_path).map((item) => {
            const simulatedEpisodes = 60 + (item.id % 40);
            return `
            <div class="card dramabox-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}" loading="lazy">
                <div class="card-badges"><span class="badge-episodes">Ep. ${simulatedEpisodes}</span></div>
                <div class="card-info-overlay"><p class="card-title">${item.title || item.name}</p></div>
            </div>`;
        }).join('');

        const viewAllCard = document.createElement('div');
        viewAllCard.className = "card dramabox-card view-all-card";
        viewAllCard.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a; cursor:pointer; border-radius: 8px;"><span>View All</span></div>`;
        viewAllCard.onclick = () => this.viewAll(containerId);
        container.appendChild(viewAllCard);
    }

    async viewAll(containerId) {
        const font = document.getElementById("search-results");
        const overlay = document.getElementById("search-overlay");
        if (!font || !overlay) return;

        this.currentViewAllPage = 1;
        this.isFetchingViewAll = false;
        font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Loading list...</div>";
        overlay.style.display = "block";

        let url = "";
        const mapping = {
            "trending-today": `${BASE_URL}/trending/all/day?api_key=${API_KEY}`,
            "marvel-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_companies=420&sort_by=release_date.desc`,
            "pinoy-action-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_genres=28&with_origin_country=PH`,
            "anime-list": `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`,
            "filipino-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`,
            "kdrama-list": `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18`,
            "kpop-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10402&with_original_language=ko`,
            "kids-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16,10751`,
            "cocomelon-list": `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16,10751&keywords=210024|310931|234327&sort_by=popularity.desc`,
            "netflix-movies-list": `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=8&watch_region=PH&sort_by=popularity.desc`,
            "dramabox-list": `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=18,10766&without_genres=16&with_original_language=zh|ko&sort_by=popularity.desc`
        };

        if (containerId === "continue-list") {
            font.innerHTML = continueWatching.filter(i => i.poster_path).map(item => `
                <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                    <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
                </div>`).join('');
            return;
        }

        url = mapping[containerId] || "";
        if (!url) return;
        this.currentViewAllUrl = url;

        try {
            const [page1, page2] = await Promise.all([
                fetch(`${url}&page=1`).then(r => r.json()),
                fetch(`${url}&page=2`).then(r => r.json())
            ]);
            const allItems = [...(page1.results || []), ...(page2.results || [])];
            this.currentViewAllPage = 2;

            font.innerHTML = allItems.filter(i => i.poster_path).map(item => `
                <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                    <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
                </div>`).join('');
        } catch (err) {
            console.error(err);
            font.innerHTML = "<div style='color:white; text-align:center; width:100%; padding:20px;'>Failed to load items.</div>";
        }
    }

    setupInfiniteScroll() {
        const overlay = document.getElementById("search-overlay");
        if (!overlay) return;
        overlay.addEventListener("scroll", async () => {
            if (this.currentViewAllUrl === "" || this.isFetchingViewAll) return;
            const font = document.getElementById("search-results");
            if (overlay.scrollTop + overlay.clientHeight >= overlay.scrollHeight - 300) {
                this.isFetchingViewAll = true;
                this.currentViewAllPage++;
                try {
                    const res = await fetch(`${this.currentViewAllUrl}&page=${this.currentViewAllPage}`).then(r => r.json());
                    if (res.results && res.results.length > 0) {
                        const extraHtml = res.results.filter(i => i.poster_path).map(item => `
                            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
                                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
                            </div>`).join('');
                        font.insertAdjacentHTML('beforeend', extraHtml);
                    }
                } catch (error) { console.error(error); } finally { this.isFetchingViewAll = false; }
            }
        });
    }
}

// ==========================================
// MODULE 2: MEDIA PLAYER & ADVANCED VIEW MANAGEMENT
// ==========================================
class CineflexPlayer {
    static updateVideoSource() {
        const iframe = document.getElementById("modal-video-iframe");
        if (!iframe || !currentItem) return;

        const movieId = currentItem.id;
        const season = currentTVState.season;
        const episode = currentTVState.currentEpNum;
        let finalUrl = "";
        let baseUrl = (activeServer === 1) ? SERVER_1_URL : SERVER_2_URL;

        if (currentTVState.type === 'tv') {
            finalUrl = `${baseUrl}/player/tv/${movieId}/${season}/${episode}?dubLang=tl&dubType=0`;
        } else {
            finalUrl = `${baseUrl}/player/movie/${movieId}?dubLang=tl&dubType=0`;
        }

        iframe.removeAttribute("src"); 
        iframe.setAttribute("allow", "autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write");
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("webkitallowfullscreen", "true");
        iframe.setAttribute("playsinline", "true");
        iframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-downloads");
        iframe.src = finalUrl;
    }

    static switchServer(serverNum) {
        activeServer = serverNum;
        this.updateServerTabsUI();
        this.updateVideoSource();
    }

    static updateServerTabsUI() {
        const btn1 = document.getElementById("srv1-btn");
        const btn2 = document.getElementById("srv2-btn");
        if (!btn1 || !btn2) return;
        if (activeServer === 1) {
            btn1.classList.add("active"); btn2.classList.remove("active");
        } else {
            btn2.classList.add("active"); btn1.classList.remove("active");
        }
    }
}

// ==========================================
// MODULE 3: INTELLIGENT UX ENGINE & INTERFACES
// ==========================================
class CineflexEngine {
    constructor() {
        this.lazyObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if(entry.isIntersecting){
                    entry.target.classList.add("loaded");
                    this.lazyObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
    }

    triggerPopUnder() {
        try {
            const adScript = document.createElement('script');
            adScript.src = "https://bashsecret.com/03/53/7d/03537deb3b1a6012bf51de011865aed1.js";
            adScript.type = "text/javascript";
            document.body.appendChild(adScript);
        } catch(e) { console.log("Ads injection failure:", e); }
    }

    observeImages() {
        document.querySelectorAll("img").forEach(img => this.lazyObserver.observe(img));
    }

    getRecommendedContent() {
        if (continueWatching.length === 0) return;
        const last = continueWatching[0];

        fetch(`${BASE_URL}/${currentTVState.type}/${last.id}/recommendations?api_key=${API_KEY}`)
            .then(r => r.json())
            .then(data => {
                if (!data.results) return;
                let row = document.getElementById("recommended-list");
                if (!row) {
                    const section = document.createElement("section");
                    section.className = "row";
                    section.innerHTML = `<h2>Recommended For You</h2><div class="scroller" id="recommended-list"></div>`;
                    document.querySelector("main").prepend(section);
                    row = document.getElementById("recommended-list");
                }
                coreApp.displayCards(data.results, "recommended-list");
            });
    }

    preloadNextBanner() {
        if (!trendingItems.length) return;
        const next = trendingItems[(currentBannerIndex + 1) % trendingItems.length];
        if (!next.backdrop_path) return;
        const img = new Image();
        img.src = `https://image.tmdb.org/t/p/original${next.backdrop_path}`;
    }
}

// ==========================================
// MODULE 4: CLOUD SYNC & LOCAL DATA STORAGE
// ==========================================
class FirebaseSync {
    static async saveUserData() {
        if (typeof auth !== 'undefined' && auth.currentUser) {
            await db.collection("users").doc(auth.currentUser.uid).set({
                watchlist: watchlist,
                continueWatching: continueWatching
            }, { merge: true });
        }
    }

    static async loadUserData() {
        if (typeof auth !== 'undefined' && auth.currentUser) {
            const doc = await db.collection("users").doc(auth.currentUser.uid).get();
            if (!doc.exists) return;
            const data = doc.data();
            watchlist = data.watchlist || [];
            continueWatching = data.continueWatching || [];
            localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
            localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
            updateContinueUI();
        }
    }
}

// ==========================================
// EXPOSED GLOBAL USER INTERACTION ROUTINES
// ==========================================
const coreApp = new CineflexCore();
const uxEngine = new CineflexEngine();

async function showDetails(item) {
    currentItem = item;
    const type = (item.first_air_date || item.name || item.media_type === 'tv') ? 'tv' : 'movie';
    currentTVState.type = type;
    activeServer = 1;

    const modal = document.getElementById("details-modal");
    const playerContainer = document.getElementById("modal-player-container");
    const iframe = document.getElementById("modal-video-iframe");

    if (playerContainer) playerContainer.style.display = "none";
    if (iframe) iframe.src = "";
    closeSearch();

    try {
        const [details, credits, recs] = await Promise.all([
            fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${type}/${item.id}/credits?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
        ]);

        document.getElementById("modal-title").innerText = item.title || item.name;
        document.getElementById("modal-desc").innerText = item.overview || "";
        document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
        
        const recContainer = document.getElementById("modal-recommendations");
        if (recContainer) {
            recContainer.className = "modern-grid-container";
            recContainer.innerHTML = recs.results.slice(0, 8).map(r => {
                const releaseYear = r.release_date || r.first_air_date ? new Date(r.release_date || r.first_air_date).getFullYear() : "2026";
                return `
                <div class="modern-grid-item" tabindex="0" onclick='showDetails(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
                    <div class="modern-thumb-wrapper"><img src="${IMG_URL}${r.backdrop_path || r.poster_path}" class="modern-img" loading="lazy"></div>
                    <div class="modern-meta-info"><h4 class="modern-ep-title">${r.title || r.name}</h4><p class="modern-sub-text">${releaseYear} &nbsp;•&nbsp; Recommended</p></div>
                </div>`;
            }).join('');
        }

        const castContainer = document.getElementById("modal-cast");
        if (castContainer) {
            castContainer.innerHTML = credits.cast.slice(0, 8).map(c => `
                <div class="cast-card"><img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100x150'}"><p>${c.name}</p></div>`).join('');
        }

        const epSelector = document.getElementById("episode-selector");
        const movieBtn = document.getElementById("movie-play-action");

        if (type === 'tv') {
            if (epSelector) epSelector.style.display = "block";
            if (movieBtn) movieBtn.style.display = "none";
            setupSeasonSelector(details);
        } else {
            if (epSelector) epSelector.style.display = "none";
            if (movieBtn) movieBtn.style.display = "block";
        }

        const wlBtn = document.getElementById("modal-watchlist-btn");
        if (wlBtn) {
            const isAdded = watchlist.some(i => i.id === item.id);
            wlBtn.innerHTML = isAdded ? `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> In My List` : `<i class="fa-solid fa-plus"></i> My List`;
        }

        if (modal) {
            modal.style.display = "flex";
            document.body.style.overflow = "hidden";
            document.querySelector('.modal-content').scrollTo({ top: 0 });
        }
    } catch (err) { console.error("Details Error:", err); }
}

function startPlayback() {
    requireLogin(() => {
        const playerContainer = document.getElementById("modal-player-container");
        if (playerContainer) playerContainer.style.display = "block";

        CineflexPlayer.updateVideoSource();
        document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });

        addToContinueWatching(currentItem);
        enterCinemaMode();
        setTimeout(() => uxEngine.triggerPopUnder(), 2500);
    });
}

function playSpecificEpisode(epNum, element) {
    requireLogin(() => {
        document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');

        currentTVState.currentEpNum = epNum;
        const playerContainer = document.getElementById("modal-player-container");
        if (playerContainer) playerContainer.style.display = "block";

        CineflexPlayer.updateVideoSource();
        document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });

        addToContinueWatching(currentItem);
        enterCinemaMode();
        setTimeout(() => uxEngine.triggerPopUnder(), 2500);
    });
}

async function playTrailer() {
    if (!currentItem) return;
    const iframe = document.getElementById("modal-video-iframe");
    const playerContainer = document.getElementById("modal-player-container");

    try {
        const res = await fetch(`${BASE_URL}/${currentTVState.type}/${currentItem.id}/videos?api_key=${API_KEY}`).then(r => r.json());
        const trailerItem = res.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || res.results.find(v => v.site === 'YouTube');

        if (trailerItem && trailerItem.key) {
            if (playerContainer) playerContainer.style.display = "block";
            if (iframe) iframe.src = `https://www.youtube.com/embed/${trailerItem.key}?autoplay=1&rel=0&modestbranding=1`;
            document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => uxEngine.triggerPopUnder(), 2000); 
        } else {
            alert("Paumanhin, walang available na trailer.");
        }
    } catch (err) { console.error(err); }
}

function setupSeasonSelector(series) {
    const seasonSelect = document.getElementById("season-select");
    if (!seasonSelect) return;
    seasonSelect.innerHTML = series.seasons.filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
    loadEpisodes(series.id, 1);
}

async function loadEpisodes(seriesId, seasonNum) {
    const data = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNum}?api_key=${API_KEY}`).then(r => r.json());
    currentTVState.season = seasonNum;
    const epList = document.getElementById("episode-list");
    
    if (epList) {
        epList.className = "modern-grid-container"; 
        epList.innerHTML = data.episodes.map(e => {
            const airDate = e.air_date ? new Date(e.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "2026";
            const runtime = e.runtime ? `${e.runtime}m` : `${50 + (e.episode_number % 15)}m`;
            return `
            <div class="modern-grid-item" tabindex="0" onclick="playSpecificEpisode(${e.episode_number}, this)">
                <div class="modern-thumb-wrapper">
                    <img src="${e.still_path ? IMG_URL + e.still_path : 'https://via.placeholder.com/300x170'}" class="modern-img" loading="lazy">
                    <div class="modern-ep-badge">E${e.episode_number}</div>
                </div>
                <div class="modern-meta-info"><h4 class="modern-ep-title">Episode ${e.episode_number}</h4><p class="modern-sub-text">${airDate} &nbsp;•&nbsp; ${runtime}</p></div>
            </div>`;
        }).join('');
    }
}

// Watchlist and Controls Helpers
function toggleWatchlist() {
    if (!currentItem) return;
    const index = watchlist.findIndex(i => i.id === currentItem.id);
    const wlBtn = document.getElementById("modal-watchlist-btn");

    if (index === -1) {
        watchlist.unshift(currentItem);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> In My List`;
    } else {
        watchlist.splice(index, 1);
        if (wlBtn) wlBtn.innerHTML = `<i class="fa-solid fa-plus"></i> My List`;
    }
    localStorage.setItem("cineflex_watchlist", JSON.stringify(watchlist));
    FirebaseSync.saveUserData();
}

function viewWatchlist() {
    closeMenuDrawer();
    const font = document.getElementById("search-results");
    const overlay = document.getElementById("search-overlay");
    if (!font || !overlay) return;

    font.innerHTML = "";
    overlay.style.display = "block";

    if (watchlist.length === 0) {
        font.innerHTML = `<div style="color:#aaa; text-align:center; width:100%; padding:40px; font-size:1rem;">Walang laman ang iyong My List.</div>`;
        return;
    }
    font.innerHTML = watchlist.filter(i => i.poster_path).map(item => `
        <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}); closeSearch();'>
            <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
        </div>`).join('');
}

function triggerDownload() {
    if (!currentItem) return;
    uxEngine.triggerPopUnder();
    const movieId = currentItem.id;
    const type = currentTVState.type; 
    const season = currentTVState.season;
    const episode = currentTVState.currentEpNum;
    let downloadUrl = (type === 'tv') ? `${SERVER_1_URL}/download/tv/${movieId}/${season}/${episode}` : `${SERVER_1_URL}/download/movie/${movieId}`;
    window.open(downloadUrl, '_blank');
}

const processSearch = async (q) => {
    const font = document.getElementById("search-results");
    if (!font) return;
    if (q.length < 2) { font.innerHTML = ""; return; }
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${q}`).then(r => r.json());
        font.innerHTML = res.results.filter(i => i.poster_path).map(item => `
            <div class="search-card" tabindex="0" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                <img src="${IMG_URL}${item.poster_path}"><p>${item.title || item.name}</p>
            </div>`).join('');
    } catch (err) { console.error(err); }
};

function addToContinueWatching(item) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift(item);
    if (continueWatching.length > 10) continueWatching.pop();
    localStorage.setItem("cineflex_recent", JSON.stringify(continueWatching));
    FirebaseSync.saveUserData();
    updateContinueUI();
}

function updateContinueUI() {
    const section = document.getElementById("continue-watching-section");
    if(continueWatching.length > 0 && section) {
        section.style.display = "block";
        coreApp.displayCards(continueWatching, "continue-list");
    }
}

// Navigation Utility Switches
function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("active"); }
function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("active"); }
function closeModal() { 
    document.getElementById("details-modal").style.display = "none"; 
    document.getElementById("modal-video-iframe").src = ""; 
    document.body.style.overflow = "auto"; 
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function') screen.orientation.unlock();
}
function openSearch() { document.getElementById("search-overlay").style.display = "block"; document.getElementById("searchInput").focus(); }
function closeSearch() { document.getElementById("search-overlay").style.display = "none"; }

function changeBanner(dir) {
    if (!trendingItems.length) return;
    currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length;
    coreApp.setBanner(trendingItems[currentBannerIndex]);
}

function showBannerDetails() { if (trendingItems[currentBannerIndex]) showDetails(trendingItems[currentBannerIndex]); }

async function enterCinemaMode() {
    const playerContainer = document.getElementById("modal-player-container");
    if (!playerContainer) return;
    try {
        if (playerContainer.requestFullscreen) await playerContainer.requestFullscreen();
        if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
            await screen.orientation.lock("landscape").catch(e => console.log(e));
        }
    } catch (err) { console.log(err); }
}

// Touch Handling Logic
function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { 
    touchEndX = e.changedTouches[0].screenX; 
    if (touchStartX - touchEndX > 50) changeBanner(1);
    if (touchEndX - touchStartX > 50) changeBanner(-1);
}

// ==========================================
// CENTRAL APPLICATION EVENT DOM BINDINGS
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => console.error(err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.style.display = 'none';
        });
    }

    const banner = document.getElementById("banner");
    if (banner) {
        banner.addEventListener('touchstart', handleTouchStart, false);
        banner.addEventListener('touchend', handleTouchEnd, false);
    }

    window.addEventListener("scroll", () => {
        const nav = document.querySelector(".navbar");
        if (nav) {
            if (window.scrollY > 30) nav.classList.add("scrolled");
            else nav.classList.remove("scrolled");
        }
    });

    // Automated Intervals for Engines
    setInterval(() => { if (trendingItems.length > 1) changeBanner(1); }, 10000);
    setInterval(() => uxEngine.preloadNextBanner(), 8000);
    setTimeout(() => uxEngine.getRecommendedContent(), 2000);
    setTimeout(() => uxEngine.observeImages(), 1500);

    // Booting up Application
    coreApp.init();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeSearch(); }
});

const bodyObserver = new MutationObserver(() => uxEngine.observeImages());
bodyObserver.observe(document.body, { childList: true, subtree: true });

console.log("✅ Cineflex Premium Refactored OOP Engine Loaded");
