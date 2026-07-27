/* =====================================
   CINEFLEX BUILD 24 - PREMIUM HOMEPAGE
===================================== */
(function(){
  const IMG_ORIGINAL = "https://image.tmdb.org/t/p/original";
  const IMG_W500 = "https://image.tmdb.org/t/p/w500";
  let heroDotsReady = false;

  function safeItemJson(item){
    return JSON.stringify(item).replace(/'/g, "&apos;");
  }

  function injectHeroSide(){
    const banner = document.getElementById("banner");
    if (!banner || document.querySelector(".cf-hero-side")) return;
    banner.insertAdjacentHTML("beforeend", `
      <div class="cf-hero-side">
        <div class="cf-hero-preview">
          <strong id="cf-hero-preview-title">Featured Today</strong>
          <p id="cf-hero-preview-text">Auto-changing cinematic picks powered by TMDB.</p>
        </div>
        <div class="cf-hero-dots" id="cf-hero-dots"></div>
      </div>
    `);
  }

  function injectQuickRail(){
    const main = document.querySelector("main.content");
    if (!main || document.querySelector(".cf-quick-rail")) return;
    main.insertAdjacentHTML("afterbegin", `
      <div class="cf-quick-rail" aria-label="Quick browse">
        <button class="cf-quick-pill" onclick="document.getElementById('trending-section')?.scrollIntoView({behavior:'smooth'})">🔥 Trending</button>
        <button class="cf-quick-pill" onclick="document.getElementById('netflix-movies-section')?.scrollIntoView({behavior:'smooth'})">🎬 Netflix Movies</button>
        <button class="cf-quick-pill" onclick="document.getElementById('marvel-section')?.scrollIntoView({behavior:'smooth'})">🦸 Marvel</button>
        <button class="cf-quick-pill" onclick="document.getElementById('anime-section')?.scrollIntoView({behavior:'smooth'})">🐉 Anime</button>
        <button class="cf-quick-pill" onclick="document.getElementById('kids-section')?.scrollIntoView({behavior:'smooth'})">👶 Kids</button>
        <button class="cf-quick-pill" onclick="document.getElementById('filipino-section')?.scrollIntoView({behavior:'smooth'})">🇵🇭 Pinoy</button>
      </div>
    `);
  }

  function addSectionControls(){
    document.querySelectorAll("main.content .row").forEach((row)=>{
      if (row.dataset.cfTools === "1") return;
      const h2 = row.querySelector("h2");
      const scroller = row.querySelector(".scroller");
      if (!h2 || !scroller) return;
      row.dataset.cfTools = "1";
      const tools = document.createElement("div");
      tools.className = "cf-section-tools";
      h2.parentNode.insertBefore(tools, h2);
      tools.appendChild(h2);
      tools.insertAdjacentHTML("beforeend", `
        <div class="cf-scroll-controls">
          <button class="cf-scroll-btn" type="button" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="cf-scroll-btn" type="button" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      `);
      const [left,right] = tools.querySelectorAll(".cf-scroll-btn");
      left.addEventListener("click",()=>scroller.scrollBy({left:-Math.max(320, scroller.clientWidth*.75),behavior:"smooth"}));
      right.addEventListener("click",()=>scroller.scrollBy({left:Math.max(320, scroller.clientWidth*.75),behavior:"smooth"}));
    });
  }

  function setupHeroDots(){
    const dots = document.getElementById("cf-hero-dots");
    if (!dots || !Array.isArray(window.trendingItems) && typeof trendingItems === "undefined") return;
    const list = (typeof trendingItems !== "undefined" ? trendingItems : []);
    if (!list.length) return;
    dots.innerHTML = list.slice(0,6).map((_,i)=>`<button class="cf-hero-dot" type="button" aria-label="Featured ${i+1}" data-i="${i}"><span></span></button>`).join("");
    dots.querySelectorAll(".cf-hero-dot").forEach(btn=>{
      btn.addEventListener("click",()=>{
        if (typeof currentBannerIndex !== "undefined") currentBannerIndex = Number(btn.dataset.i);
        if (typeof setBanner === "function") setBanner(list[Number(btn.dataset.i)]);
      });
    });
    heroDotsReady = true;
    updateHeroDots();
  }

  function updateHeroDots(){
    const dots = document.querySelectorAll(".cf-hero-dot");
    if (!dots.length) return;
    const idx = (typeof currentBannerIndex !== "undefined" ? currentBannerIndex : 0) % dots.length;
    dots.forEach((dot,i)=>{
      dot.classList.toggle("active", i === idx);
      const span = dot.querySelector("span");
      if (span) {
        span.style.animation = "none";
        span.offsetHeight;
        span.style.animation = i === idx ? "cfHeroProgress 10s linear forwards" : "none";
        if (i !== idx) span.style.width = "0";
      }
    });
  }

  function updateHeroPreview(item){
    if (!item) return;
    const title = document.getElementById("cf-hero-preview-title");
    const text = document.getElementById("cf-hero-preview-text");
    if (title) title.textContent = item.title || item.name || "Featured Today";
    if (text) {
      const year = (item.release_date || item.first_air_date || "").slice(0,4) || "New";
      const rating = item.vote_average ? `${Number(item.vote_average).toFixed(1)} ★` : "HD";
      text.textContent = `${year} • ${rating} • Tap Watch Now para buksan ang details.`;
    }
  }

  function buildTop10(){
    const main = document.querySelector("main.content");
    if (!main || document.getElementById("cf-top10-list")) return;
    const trendingSection = document.getElementById("trending-section");
    const section = document.createElement("section");
    section.className = "row cf-top10-row";
    section.id = "cf-top10-section";
    section.innerHTML = `<h2>Top 10 in CineFlex Today</h2><div class="scroller" id="cf-top10-list"></div>`;
    if (trendingSection) trendingSection.parentNode.insertBefore(section, trendingSection.nextSibling);
    else main.prepend(section);
    renderTop10();
    addSectionControls();
  }

  function renderTop10(){
    const list = document.getElementById("cf-top10-list");
    const data = (typeof trendingItems !== "undefined" ? trendingItems : []);
    if (!list || !data.length) return;
    list.innerHTML = data.filter(x=>x.poster_path).slice(0,10).map((item,i)=>`
      <div class="cf-top10-card" tabindex="0" onclick='showDetails(${safeItemJson(item)})'>
        <div class="cf-top10-number">${i+1}</div>
        <img src="${IMG_W500}${item.poster_path}" loading="lazy" alt="${item.title || item.name || 'CineFlex title'}">
      </div>
    `).join("");
  }

  function patchSetBanner(){
    if (typeof window.setBanner !== "function" || window.setBanner.__cf24) return;
    const original = window.setBanner;
    window.setBanner = function(item){
      original(item);
      const banner = document.getElementById("banner");
      const desc = document.getElementById("banner-desc");
      if (banner && item && item.backdrop_path) {
        banner.style.backgroundImage = `linear-gradient(to top, #050505 1%, transparent 62%), url(${IMG_ORIGINAL}${item.backdrop_path})`;
      }
      if (desc && item && item.overview) desc.textContent = item.overview.slice(0,170) + (item.overview.length > 170 ? "..." : "");
      updateHeroPreview(item);
      updateHeroDots();
    };
    window.setBanner.__cf24 = true;
  }

  function patchDisplayCards(){
    if (typeof window.displayCards !== "function" || window.displayCards.__cf24) return;
    const original = window.displayCards;
    window.displayCards = function(data, containerId){
      original(data, containerId);
      setTimeout(()=>{
        addSectionControls();
        if (typeof observeImages === "function") observeImages();
      }, 60);
    };
    window.displayCards.__cf24 = true;
  }

  function boot(){
    injectHeroSide();
    injectQuickRail();
    patchSetBanner();
    patchDisplayCards();
    addSectionControls();
    const wait = setInterval(()=>{
      const data = (typeof trendingItems !== "undefined" ? trendingItems : []);
      if (data.length) {
        buildTop10();
        if (!heroDotsReady) setupHeroDots();
        if (typeof currentBannerIndex !== "undefined") updateHeroPreview(data[currentBannerIndex] || data[0]);
        clearInterval(wait);
      }
    }, 350);
    setTimeout(()=>clearInterval(wait), 10000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
