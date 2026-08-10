const data=[
 {title:'FreeReels Demo Series',episode:1,video:''},
 {title:'Add your legal video source here',episode:2,video:''}
];
const box=document.getElementById('reels');
data.forEach(x=>{let d=document.createElement('div');d.className='reel';d.innerHTML=(x.video?`<iframe src="${x.video}" allowfullscreen></iframe>`:'<div></div>')+`<div class="info"><h2>${x.title}</h2><p>Episode ${x.episode}</p></div><div class="actions"><button class="btn">❤</button><button class="btn">＋</button></div>`;box.appendChild(d)});
let index=0;box.addEventListener('wheel',e=>{window.scrollBy(0,e.deltaY>0?innerHeight:-innerHeight)});
