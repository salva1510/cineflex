const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let trendingItems = [];

async function getMovies() {
    const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
    const data = await res.json();
    trendingItems = data.results;
    
    // Banner Logic
    const hero = trendingItems[0];
    document.getElementById('banner').style.backgroundImage = `linear-gradient(to top, var(--bg), transparent), url(https://image.tmdb.org/t/p/original${hero.backdrop_path})`;
    document.getElementById('banner-content').innerHTML = `
        <h1 style="font-size:3rem; margin:0; text-shadow: 2px 2px 10px rgba(0,0,0,0.8);">${hero.title || hero.name}</h1>
        <p style="max-width:600px; text-shadow: 1px 1px 5px rgba(0,0,0,0.8);">${hero.overview.slice(0, 150)}...</p>
    `;

    renderGrid(trendingItems, "trending-grid");
}

async function getTV() {
    const res = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`);
    const data = await res.json();
    renderGrid(data.results, "tv-grid");
}

function renderGrid(movies, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = movies.map(movie => {
        const title = movie.title || movie.name;
        // Dynamic Badge based on rating
        const isLive = movie.vote_average > 7.5 ? '<span class="status-badge">LIVE</span>' : '<span class="status-badge" style="background:#444; box-shadow:none;">HD</span>';
        
        return `
            <div class="movie-card" onmouseenter="playPreview(${movie.id})" onmouseleave="stopPreview()" onclick="window.location.href='https://www.themoviedb.org/${movie.media_type || 'movie'}/${movie.id}'">
                ${isLive}
                <img src="${IMG_URL + movie.poster_path}" alt="${title}" loading="lazy">
                <div class="movie-title">${title}</div>
            </div>
        `;
    }).join('');
}

// RETAIN YOUR ORIGINAL PREVIEW LOGIC
let previewTimeout;
async function playPreview(id) {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(async () => {
        const data = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`).then(r => r.json());
        const trailer = data.results?.find(v => v.site === "YouTube");
        if (trailer) {
            const iframe = document.createElement("iframe");
            iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0`;
            iframe.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; border:none; pointer-events:none; z-index:2;";
            iframe.className = "preview-player";
            event.target.closest('.movie-card').appendChild(iframe);
        }
    }, 1000);
}

function stopPreview() {
    clearTimeout(previewTimeout);
    document.querySelectorAll(".preview-player").forEach(e => e.remove());
}

function toggleSearch() {
    const bar = document.getElementById('search-bar-container');
    bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
}

// RETAIN YOUR FIREBASE CHAT LOGIC
function setupChat() {
    if (!window.db) return setTimeout(setupChat, 1000);
    const q = query(collection(window.db, "chat"), orderBy("time"));
    onSnapshot(q, snapshot => {
        const box = document.getElementById("messages");
        box.innerHTML = "";
        snapshot.forEach(doc => {
            const d = doc.data();
            box.innerHTML += `<p style="font-size:14px; margin:8px 0;"><b>${d.user || 'Guest'}:</b> ${d.text}</p>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById("chatInput");
    if (!input.value || !window.db) return;
    addDoc(collection(window.db, "chat"), { text: input.value, user: "User", time: Date.now() });
    input.value = "";
}

// INIT
getMovies();
getTV();
setupChat();
