/* =============================== CINEFLEX – FULL home.js (NO CUTS) Includes:

Banner load + swipe

Banner trailer (FULL FIT)

Modal details + modal trailer

Search

Menu drawer

Safe state handling =============================== */


const API_KEY = "742aa17a327005b91fb6602054523286"; const BASE_URL = "https://api.themoviedb.org/3"; const IMG_ORIGINAL = "https://image.tmdb.org/t/p/original"; const IMG_W500 = "https://image.tmdb.org/t/p/w500";

let trendingItems = []; let currentBannerIndex = 0; let currentItem = null;

/* ================= INIT ================= */ async function init() { try { const res = await fetch(${BASE_URL}/trending/all/week?api_key=${API_KEY}); const data = await res.json();

trendingItems = data.results.filter(i => i.backdrop_path && i.poster_path);
currentBannerIndex = 0;
currentItem = trendingItems[0];

setBanner(currentItem);
renderRow(trendingItems, "main-list");

} catch (e) { console.error("INIT ERROR", e); } }

/* ================= BANNER ================= */ function setBanner(item) { const banner = document.getElementById("banner"); banner.style.backgroundImage = url(${IMG_ORIGINAL}${item.backdrop_path});

document.getElementById("banner-title").innerText = item.title || item.name; document.getElementById("banner-desc").innerText = item.overview || "No description available."; }

function changeBanner(dir) { closeTrailer(); currentBannerIndex = (currentBannerIndex + dir + trendingItems.length) % trendingItems.length; currentItem = trendingItems[currentBannerIndex]; setBanner(currentItem); }

/* ================= SWIPE ================= */ let startX = 0; let endX = 0; const bannerEl = document.getElementById("banner");

bannerEl.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });

bannerEl.addEventListener("touchend", e => { endX = e.changedTouches[0].clientX; if (Math.abs(endX - startX) > 60) { changeBanner(endX > startX ? -1 : 1); } }, { passive: true });

/* ================= BANNER TRAILER ================= */ async function playTrailer() { if (!currentItem) return;

const type = currentItem.first_air_date ? "tv" : "movie"; const res = await fetch(${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}); const data = await res.json();

const trailer = data.results.find(v => v.site === "YouTube" && v.type === "Trailer"); if (!trailer) return alert("Trailer not available");

document.getElementById("trailer-container").style.display = "block"; document.getElementById("player").innerHTML =  <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&controls=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>; }

function closeTrailer() { document.getElementById("trailer-container").style.display = "none"; document.getElementById("player").innerHTML = ""; }

/* ================= ROW / CARDS ================= */ function renderRow(items, targetId) { const target = document.getElementById(targetId); target.innerHTML = "";

items.forEach(item => { const card = document.createElement("div"); card.className = "card"; card.innerHTML = <img src="${IMG_W500}${item.poster_path}" alt="">; card.onclick = () => openDetails(item); target.appendChild(card); }); }

/* ================= DETAILS MODAL ================= */ function openDetails(item) { currentItem = item; closeTrailer();

const modal = document.getElementById("details-modal"); modal.style.display = "flex";

document.getElementById("modal-banner").style.backgroundImage = url(${IMG_ORIGINAL}${item.backdrop_path}); document.getElementById("modal-title").innerText = item.title || item.name; document.getElementById("modal-desc").innerText = item.overview || "No description available.";

document.getElementById("modal-trailer").style.display = "none"; document.getElementById("modal-trailer-player").src = ""; }

function closeModal() { document.getElementById("details-modal").style.display = "none"; document.getElementById("modal-trailer").style.display = "none"; document.getElementById("modal-trailer-player").src = ""; }

/* ================= MODAL TRAILER ================= */ async function playModalTrailer() { if (!currentItem) return;

const type = currentItem.first_air_date ? "tv" : "movie"; const res = await fetch(${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}); const data = await res.json();

const trailer = data.results.find(v => v.site === "YouTube" && v.type === "Trailer"); if (!trailer) return alert("Trailer not available");

document.getElementById("modal-trailer").style.display = "block"; document.getElementById("modal-trailer-player").src = https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0; }

/* ================= SEARCH ================= */ async function processSearch(query) { if (!query.trim()) return;

const res = await fetch(${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}); const data = await res.json();

const grid = document.getElementById("search-results"); grid.innerHTML = "";

data.results.filter(i => i.poster_path).forEach(item => { const div = document.createElement("div"); div.className = "card"; div.innerHTML = <img src="${IMG_W500}${item.poster_path}">; div.onclick = () => { closeSearch(); openDetails(item); }; grid.appendChild(div); }); }

function openSearch() { document.getElementById("search-overlay").style.display = "block"; }

function closeSearch() { document.getElementById("search-overlay").style.display = "none"; document.getElementById("search-results").innerHTML = ""; }

/* ================= DRAWER ================= */ function openMenuDrawer() { document.getElementById("menu-drawer").classList.add("open"); }

function closeMenuDrawer() { document.getElementById("menu-drawer").classList.remove("open"); }

/* ================= FILTER ================= */ async function filterByGenre(genreId, el) { closeMenuDrawer();

document.querySelectorAll(".drawer-content p").forEach(p => p.classList.remove("active")); el.classList.add("active");

let url = ${BASE_URL}/discover/movie?api_key=${API_KEY}; if (genreId !== "all") url += &with_genres=${genreId};

const res = await fetch(url); const data = await res.json();

renderRow(data.results.filter(i => i.poster_path), "main-list"); }

/* ================= PLACEHOLDERS ================= */ function openAccount(){ alert("Account system not connected yet"); } function openDMCA(){ document.getElementById("dmca-modal").style.display="flex"; } function closeDMCA(){ document.getElementById("dmca-modal").style.display="none"; } function startPlayback(){ alert("Connect your video player here"); } function toggleMyList(){ alert("My List feature coming soon"); }

/* ================= RUN ================= */ document.addEventListener("DOMContentLoaded", init);
