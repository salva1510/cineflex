:root {
    --bg: #050505;
    --accent: #e50914;
    --text: #ffffff;
    --card-w: 160px;
    --card-h: 240px;
}

body {
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    overflow-x: hidden;
}

/* Navbar */
.navbar {
    position: fixed;
    width: 100%;
    padding: 15px 5%;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent);
    box-sizing: border-box;
}

.logo { color: var(--accent); font-weight: 900; font-size: 1.8rem; letter-spacing: -1px; }
.nav-icons i { font-size: 1.2rem; cursor: pointer; margin-left: 20px; transition: 0.3s; }

/* Banner */
.banner {
    height: 75vh;
    background-size: cover;
    background-position: center top;
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 5%;
}

.banner-content { max-width: 600px; z-index: 2; }
.banner-fade {
    position: absolute;
    bottom: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to top, var(--bg) 5%, transparent 70%);
}

/* Scroller & Cards */
.content { padding: 0 5%; margin-top: -50px; position: relative; z-index: 5; }
.scroller {
    display: flex;
    gap: 15px;
    overflow-x: auto;
    padding: 20px 0;
    scrollbar-width: none;
}
.scroller::-webkit-scrollbar { display: none; }

.card {
    min-width: var(--card-w);
    height: var(--card-h);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: 0.4s;
    flex-shrink: 0;
}

.card:hover { transform: scale(1.1); z-index: 10; }
.card img { width: 100%; height: 100%; object-fit: cover; }

.badge-rating {
    position: absolute;
    top: 8px; left: 8px;
    background: var(--accent);
    font-size: 0.7rem;
    padding: 3px 6px;
    border-radius: 4px;
    font-weight: bold;
}

/* Search Overlay */
.search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 2000;
    display: none;
    padding: 40px 5%;
    overflow-y: auto;
}

.search-input-wrapper {
    display: flex;
    background: #111;
    padding: 15px;
    border-radius: 50px;
    max-width: 700px;
    margin: 0 auto 30px;
    border: 1px solid #333;
}

.search-input-wrapper input {
    background: transparent;
    border: none;
    color: white;
    width: 100%;
    padding: 0 15px;
    outline: none;
}

.search-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 20px;
}

/* Player UI */
.player-wrapper {
    width: 95%; max-width: 1100px; margin: 20px auto;
    background: #000; border-radius: 12px; overflow: hidden;
}

.iframe-container { position: relative; padding-bottom: 56.25%; height: 0; }
.iframe-container iframe { position: absolute; inset: 0; width: 100%; height: 100%; }

/* Mobile Landscape Force */
@media screen and (max-width: 768px) {
    #player-container:fullscreen .iframe-container {
        width: 100vh;
        height: 100vw;
        transform: rotate(90deg);
        padding-bottom: 0;
    }
}

/* Modal */
.modal {
    position: fixed; inset: 0; background: rgba(0,0,0,0.9);
    display: none; align-items: center; justify-content: center; z-index: 3000;
}

.modal-content {
    background: #181818; width: 90%; max-width: 750px;
    border-radius: 15px; overflow: hidden; max-height: 90vh;
}

.modal-banner { height: 300px; background-size: cover; background-position: center; }
.modal-body { padding: 25px; }

.episode-controls {
    display: flex; gap: 15px; background: #222; padding: 15px;
    border-radius: 8px; margin: 15px 0;
}
.selector-group select { background: #333; color: white; border: none; padding: 8px; border-radius: 5px; width: 100%; }

.play-btn-large { background: var(--accent); color: white; width: 100%; padding: 15px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
  
