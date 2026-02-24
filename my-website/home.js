const API_KEY = "742aa17a327005b91fb6602054523286";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;

async function init() {
  try {
    const [trending, topRated] = await Promise.all([
      fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`).then(res => res.json()),
      fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`).then(res => res.json())
    ]);

    displayCards(trending.results, "main-list");
    displayCards(topRated.results, "toprated-list");
    
    if (trending.results.length > 0) {
      currentItem = trending.results[0];
      setBanner(currentItem);
    }
  } catch (err) {
    console.error("CineFlex Data Error:", err);
  }
}

function setBanner(item) {
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
  document.getElementById("banner-title").innerText = item.title || item.name;
  document.getElementById("banner-desc").innerText = item.overview.slice(0, 150) + "...";
}

function displayCards(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = data.map(item => `
    <div class="card" onclick='updateSelection(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}">
    </div>
  `).join('');
}

function updateSelection(item) {
  currentItem = item;
  setBanner(item);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function startPlayback() {
  const id = currentItem.id;
  const isTV = currentItem.first_air_date || currentItem.name;
  const player = document.getElementById("video-player");
  
  // High-performance streaming source from zxcstream
  player.src = isTV 
    ? `https://zxcstream.xyz/embed/tv/${id}/1/1` 
    : `https://zxcstream.xyz/embed/movie/${id}`;

  document.getElementById("player-container").style.display = "block";
  document.getElementById("player-title-display").innerText = "CineFlex: " + (currentItem.title || currentItem.name);
}

init();
