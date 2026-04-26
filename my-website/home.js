const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;

async function init() {
    try {
        const [trd, anime, kd, fil] = await Promise.all([
            fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko`).then(r => r.json()),
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&region=PH&with_origin_country=PH`).then(r => r.json())
        ]);

        displayCards(trd.results, "trending-today-list");
        displayCards(anime.results, "anime-list-inner");
        displayCards(kd.results, "kdrama-list-inner");
        displayCards(fil.results, "filipino-list-inner");

        if (trd.results.length > 0) setBanner(trd.results[0]);
    } catch (e) { console.error(e); }
}

function scrollToSection(sectionId, btn) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offset = 80;
        const target = section.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: target, behavior: 'smooth' });
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function setBanner(item) {
    const banner = document.getElementById("banner");
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("banner-title").innerText = item.title || item.name;
    document.getElementById("banner-desc").innerText = item.overview.slice(0, 100) + "...";
    currentItem = item;
}

function displayCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.filter(i => i.poster_path).map(item => `
        <div class="card" onclick='showDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL}${item.poster_path}">
        </div>
    `).join('');
}

function showDetails(item) {
    currentItem = item;
    document.getElementById("modal-title").innerText = item.title || item.name;
    document.getElementById("modal-desc").innerText = item.overview;
    document.getElementById("modal-banner").style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    document.getElementById("modal-player-container").style.display = "none";
    document.getElementById("details-modal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function startPlayback() {
    const iframe = document.getElementById("modal-video-iframe");
    document.getElementById("modal-player-container").style.display = "block";
    const type = currentItem.first_air_date ? 'tv' : 'movie';
    iframe.src = type === 'movie' ? 
        `https://zxcstream.xyz/player/movie/${currentItem.id}` : 
        `https://zxcstream.xyz/embed/tv/${currentItem.id}/1/1`;
}

function closeModal() {
    document.getElementById("details-modal").style.display = "none";
    document.getElementById("modal-video-iframe").src = "";
    document.body.style.overflow = "auto";
}

init();
