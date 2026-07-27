/* =====================================
   CINEFLEX BUILD 25 - PERSONALIZED EXPERIENCE
   Safe layer: recommendations, progress, smart rows
===================================== */
(function(){
  const IMG_W500 = "https://image.tmdb.org/t/p/w500";
  const LS_SEEN = "cineflex_seen_titles_v25";
  const LS_PROGRESS = "cineflex_progress_map_v25";
  const LS_SEARCH = "cineflex_search_history_v25";

  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch(e){ return fallback; }
  }
  function writeJSON(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  }
  function safeItemJson(item){
    return JSON.stringify(item).replace(/'/g, "&apos;");
  }
  function getRecent(){
    return readJSON("cineflex_recent", []);
  }
  function getWatchlist(){
    return readJSON("cineflex_watchlist", []);
  }
  function getTrending(){
    try { return Array.isArray(window.trendingItems) ? window.trendingItems : (typeof trendingItems !== "undefined" ? trendingItems : []); }
    catch(e){ return []; }
  }
  function itemTitle(item){ return item?.title || item?.name || "CineFlex Title"; }

  function ensureRow(id, title, afterSelector){
    const main = document.querySelector("main.content");
    if (!main) return null;
    let section = document.getElementById(id);
    if (section) return section.querySelector(".scroller");
    section = document.createElement("section");
    section.className = "row cf25-row";
    section.id = id;
    section.innerHTML = `<h2>${title}</h2><div class="scroller" id="${id}-list"></div>`;
    const after = afterSelector ? document.querySelector(afterSelector) : null;
    if (after && after.parentNode) after.parentNode.insertBefore(section, after.nextSibling);
    else main.insertBefore(section, main.firstElementChild?.nextSibling || null);
    return section.querySelector(".scroller");
  }

  function renderCard(item, extraClass, badge){
    if (!item || !item.poster_path) return "";
    const year = (item.release_date || item.first_air_date || "").slice(0,4);
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : "HD";
    return `<div class="card cf25-card ${extraClass || ""}" tabindex="0" onclick='showDetails(${safeItemJson(item)})'>
      ${badge ? `<div class="cf25-badge">${badge}</div>` : ""}
      <img src="${IMG_W500}${item.poster_path}" loading="lazy" alt="${itemTitle(item)}">
      <div class="cf25-card-info">
        <strong>${itemTitle(item)}</strong>
        <span>${year || "New"} • ${rating}${rating === "HD" ? "" : " ★"}</span>
      </div>
    </div>`;
  }

  function renderContinueUpgrades(){
    const recent = getRecent().filter(x=>x && x.poster_path).slice(0,12);
    if (!recent.length) return;
    const list = ensureRow("cf25-resume-section", "Resume Your CineFlex Night", "#continue-watching-section");
    if (!list) return;
    const progress = readJSON(LS_PROGRESS, {});
    list.innerHTML = recent.map((item, index)=>{
      const pct = progress[item.id] || Math.min(92, 18 + ((item.id || index) % 63));
      return `<div class="cf25-resume-card" tabindex="0" onclick='showDetails(${safeItemJson(item)})'>
        <img src="${IMG_W500}${item.poster_path}" loading="lazy" alt="${itemTitle(item)}">
        <div class="cf25-resume-gradient"></div>
        <button type="button" class="cf25-resume-play"><i class="fa-solid fa-play"></i></button>
        <div class="cf25-resume-meta">
          <strong>${itemTitle(item)}</strong>
          <div class="cf25-progress"><span style="width:${pct}%"></span></div>
        </div>
      </div>`;
    }).join("");
  }

  function renderMyListPreview(){
    const listData = getWatchlist().filter(x=>x && x.poster_path).slice(0,14);
    if (!listData.length) return;
    const list = ensureRow("cf25-mylist-section", "My List Picks", "#cf25-resume-section");
    if (!list) return;
    list.innerHTML = listData.map((item, i)=>renderCard(item, "", i < 3 ? "Saved" : "My List")).join("");
  }

  function renderBecauseYouWatched(){
    const recent = getRecent();
    const trend = getTrending();
    if (!trend.length) return;
    const seed = recent[0] || trend[0];
    const seedGenres = Array.isArray(seed.genre_ids) ? seed.genre_ids : [];
    let picks = trend.filter(item => item.poster_path && item.id !== seed.id);
    if (seedGenres.length) {
      picks.sort((a,b)=>{
        const as = (a.genre_ids || []).filter(g=>seedGenres.includes(g)).length;
        const bs = (b.genre_ids || []).filter(g=>seedGenres.includes(g)).length;
        return bs - as;
      });
    }
    picks = picks.slice(0,14);
    if (!picks.length) return;
    const title = seed ? `Because You Watched ${itemTitle(seed).slice(0,28)}` : "Top Picks For You";
    const list = ensureRow("cf25-picks-section", title, "#cf-top10-section");
    if (!list) return;
    list.innerHTML = picks.map((item, i)=>renderCard(item, "", i < 5 ? "For You" : "Pick")).join("");
  }

  function patchShowDetailsTracking(){
    if (typeof window.showDetails !== "function" || window.showDetails.__cf25) return;
    const original = window.showDetails;
    window.showDetails = function(item){
      if (item && item.id) {
        const seen = readJSON(LS_SEEN, []).filter(x=>x && x.id !== item.id);
        seen.unshift(item);
        writeJSON(LS_SEEN, seen.slice(0,40));
      }
      return original.apply(this, arguments);
    };
    window.showDetails.__cf25 = true;
  }

  function patchContinueProgress(){
    if (typeof window.addToContinueWatching !== "function" || window.addToContinueWatching.__cf25) return;
    const original = window.addToContinueWatching;
    window.addToContinueWatching = function(item){
      if (item && item.id) {
        const progress = readJSON(LS_PROGRESS, {});
        progress[item.id] = progress[item.id] || 7;
        writeJSON(LS_PROGRESS, progress);
      }
      const result = original.apply(this, arguments);
      setTimeout(refreshPersonalRows, 250);
      return result;
    };
    window.addToContinueWatching.__cf25 = true;
  }

  function patchSearchHistory(){
    if (typeof window.processSearch !== "function" || window.processSearch.__cf25) return;
    const original = window.processSearch;
    window.processSearch = function(query){
      const q = String(query || "").trim();
      if (q.length >= 3) {
        const history = readJSON(LS_SEARCH, []).filter(x=>x.toLowerCase() !== q.toLowerCase());
        history.unshift(q);
        writeJSON(LS_SEARCH, history.slice(0,8));
      }
      return original.apply(this, arguments);
    };
    window.processSearch.__cf25 = true;
  }

  function injectSearchChips(){
    const wrap = document.querySelector(".search-input-wrapper");
    if (!wrap || document.getElementById("cf25-search-chips")) return;
    const chips = document.createElement("div");
    chips.id = "cf25-search-chips";
    chips.className = "cf25-search-chips";
    wrap.insertAdjacentElement("afterend", chips);
    renderSearchChips();
  }

  function renderSearchChips(){
    const chips = document.getElementById("cf25-search-chips");
    if (!chips) return;
    const history = readJSON(LS_SEARCH, []);
    if (!history.length) { chips.innerHTML = ""; return; }
    chips.innerHTML = history.map(q=>`<button type="button" data-q="${q.replace(/"/g,"&quot;")}"><i class="fa-solid fa-clock-rotate-left"></i> ${q}</button>`).join("");
    chips.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      const input = document.getElementById("searchInput");
      if (input) input.value = btn.dataset.q;
      if (typeof window.processSearch === "function") window.processSearch(btn.dataset.q);
    }));
  }

  function smartPreloadImages(){
    const trend = getTrending().filter(x=>x.poster_path).slice(0,8);
    trend.forEach(item=>{
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = `${IMG_W500}${item.poster_path}`;
      document.head.appendChild(link);
    });
  }

  function refreshPersonalRows(){
    renderContinueUpgrades();
    renderMyListPreview();
    renderBecauseYouWatched();
    if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("scroll"));
  }

  function boot(){
    patchShowDetailsTracking();
    patchContinueProgress();
    patchSearchHistory();
    injectSearchChips();
    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      patchShowDetailsTracking();
      patchContinueProgress();
      patchSearchHistory();
      refreshPersonalRows();
      if (tries === 2) smartPreloadImages();
      if (tries > 18 || getTrending().length) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
