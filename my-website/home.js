const API_KEY = "742aa17a327005b91fb6602054523286";
const TMDB = "https://api.themoviedb.org/3";
let heroData = null;

// Navbar Change on Scroll
window.onscroll = () => {
    if (window.scrollY > 50) {
        document.getElementById('navbar').classList.add('scrolled');
    } else {
        document.getElementById('navbar').classList.remove('scrolled');
    }
};

async function loadSite() {
    try {
        const [res1, res2] = await Promise.all([
            fetch(`${TMDB}/trending/all/week?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${TMDB}/tv/popular?api_key=${API_KEY}`).then(r => r.json())
        ]);

        renderRow(res1.results, 'trending');
        renderRow(res2.results, 'tv-shows');

        heroData = res1.results[0];
        setHero(heroData);
    } catch (e) { console.log("CineFlex Error"); }
}

function setHero(movie) {
    document.getElementById('banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`;
    document.getElementById('banner-title').innerText = movie.title || movie.name;
    document.getElementById('banner-desc').innerText = movie.overview.substring(0, 160) + "...";
}

function renderRow(data, elementId) {
    const list = document.getElementById(elementId);
    list.innerHTML = data.map(item => `
        <div class="card" onclick="openVideo('${item.id}', '${item.media_type || (item.name ? 'tv' : 'movie')}', '${item.title || item.name}')">
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="CineFlex">
        </div>
    `).join('');
}

function openVideo(id, type, title) {
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoIframe');
    document.getElementById('modal-title').innerText = `CineFlex: ${title}`;

    // Ito ang ginagamit nilang player link
    const playerURL = type === 'tv' 
        ? `https://zxcstream.xyz/embed/tv/${id}/1/1` 
        : `https://zxcstream.xyz/embed/movie/${id}`;

    iframe.src = playerURL;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // stop scroll
}

function closeVideo() {
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoIframe');
    modal.style.display = 'none';
    iframe.src = ''; // stop playback
    document.body.style.overflow = 'auto';
}

function playHero() {
    if(heroData) openVideo(heroData.id, heroData.media_type || 'movie', heroData.title || heroData.name);
}

loadSite();
