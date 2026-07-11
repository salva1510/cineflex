(() => {
'use strict';

const ROOMS = 'watchPartyRooms';
const MAX_CHAT = 100;
const ACTIVE_WINDOW_MS = 90000;
const TYPING_WINDOW_MS = 5000;

let roomId = '';
let roomData = null;
let unsubRoom = null;
let unsubChat = null;
let unsubMembers = null;
let unsubPublic = null;
let presenceTimer = null;
let typingTimer = null;
let replyTarget = null;
let latestMembers = [];

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const user = () => window.auth?.currentUser || null;
const profile = () => {
  try { return JSON.parse(localStorage.getItem('cineflex_profile')) || {}; }
  catch { return {}; }
};
const mediaType = item => item?.media_type || (item?.first_air_date || item?.name ? 'tv' : 'movie');
const title = item => item?.title || item?.name || 'CineFlex Watch Party';
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const nowMs = value => value?.toDate ? value.toDate().getTime() : 0;

function toast(text) {
  let node = $('.cf-party-toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'cf-party-toast';
    document.body.appendChild(node);
  }
  node.textContent = text;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2300);
}

function requireUser(callback) {
  if (user()) return callback();
  if (typeof window.openLoginModal === 'function') window.openLoginModal();
  toast('Mag-login muna para sumali sa Watch Party.');
}

function currentMedia() {
  const item = window.currentItem;
  if (!item?.id) return null;
  return {
    id: item.id,
    title: title(item),
    mediaType: mediaType(item),
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    season: Number(window.currentTVState?.currentSeason || 1),
    episode: Number(window.currentTVState?.currentEpNum || 1)
  };
}

function shell() {
  if ($('#cf-party-shell')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <button class="cf-party-fab" id="cf-party-fab" type="button">
      <i class="fa-solid fa-users-viewfinder"></i><span>Watch Party</span>
    </button>

    <div class="cf-party-shell" id="cf-party-shell">
      <div class="cf-party-panel">
        <main class="cf-party-main">
          <header class="cf-party-head">
            <div class="cf-party-title">
              <span class="cf-party-kicker">CineFlex Together</span>
              <h2>Watch Party Lounge</h2>
              <div class="cf-party-status" id="cf-party-status">Create or join a room.</div>
            </div>
            <button class="cf-party-close" id="cf-party-close" type="button">×</button>
          </header>

          <section class="cf-party-hero" id="cf-party-hero">
            <div class="cf-reaction-stage" id="cf-reaction-stage"></div>
            <div class="cf-party-hero-content">
              <span class="cf-party-code" id="cf-party-code">NO ROOM</span>
              <h3 id="cf-party-media-title">Choose a movie, then create a party.</h3>
              <p id="cf-party-host-note">Real-time room, presence, reactions, and chat.</p>
            </div>
          </section>

          <div class="cf-party-createbar">
            <label class="cf-party-privacy">
              <span>Room privacy</span>
              <select id="cf-room-privacy">
                <option value="private">🔒 Private</option>
                <option value="public">🌍 Public</option>
              </select>
            </label>
          </div>

          <div class="cf-party-actions">
            <button class="cf-party-btn primary" id="cf-create-room"><i class="fa-solid fa-plus"></i> Create Room</button>
            <button class="cf-party-btn" id="cf-copy-room"><i class="fa-solid fa-link"></i> Copy Invite</button>
            <button class="cf-party-btn" id="cf-host-sync"><i class="fa-solid fa-rotate"></i> Start / Resync</button>
            <button class="cf-party-btn danger" id="cf-leave-room"><i class="fa-solid fa-right-from-bracket"></i> Leave</button>
          </div>

          <div class="cf-party-join">
            <input class="cf-party-input" id="cf-room-input" maxlength="6" placeholder="Enter 6-character room code">
            <button class="cf-party-btn" id="cf-join-room">Join</button>
          </div>

          <section class="cf-public-rooms">
            <div class="cf-public-head">
              <div><span class="cf-party-kicker">Live Now</span><h3>Public Watch Rooms</h3></div>
              <button class="cf-party-btn" id="cf-refresh-public" aria-label="Refresh public rooms"><i class="fa-solid fa-rotate"></i></button>
            </div>
            <div class="cf-public-list" id="cf-public-list"><div class="cf-chat-empty">Loading public rooms...</div></div>
          </section>

          <div class="cf-party-grid">
            <article class="cf-party-card">
              <strong><i class="fa-solid fa-user-group"></i> Participants</strong>
              <span id="cf-party-count">0 online</span>
              <div class="cf-party-members" id="cf-party-members"></div>
            </article>
            <article class="cf-party-card">
              <strong><i class="fa-solid fa-wand-magic-sparkles"></i> Live Reactions</strong>
              <span id="cf-party-sync-state">Waiting for room.</span>
              <div class="cf-party-actions cf-reaction-buttons">
                <button class="cf-party-btn" data-react="🔥">🔥</button>
                <button class="cf-party-btn" data-react="❤️">❤️</button>
                <button class="cf-party-btn" data-react="😂">😂</button>
                <button class="cf-party-btn" data-react="😮">😮</button>
                <button class="cf-party-btn" data-react="👏">👏</button>
              </div>
            </article>
          </div>
        </main>

        <aside class="cf-party-side">
          <div class="cf-chat-head">
            <span><i class="fa-solid fa-comments"></i> Party Chat</span>
            <span class="cf-chat-online" id="cf-chat-online">0 online</span>
          </div>
          <div class="cf-chat-list" id="cf-chat-list"><div class="cf-chat-empty">Join a room to start chatting.</div></div>
          <div class="cf-typing" id="cf-typing" hidden></div>
          <div class="cf-reply-preview" id="cf-reply-preview" hidden>
            <div><span>Replying to</span><strong id="cf-reply-name"></strong><p id="cf-reply-text"></p></div>
            <button type="button" id="cf-reply-cancel" aria-label="Cancel reply">×</button>
          </div>
          <form class="cf-chat-compose" id="cf-chat-form">
            <input class="cf-party-input" id="cf-chat-input" maxlength="280" autocomplete="off" placeholder="Message the party...">
            <button class="cf-party-btn primary" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
        </aside>
      </div>
    </div>
  `);

  $('#cf-party-fab').onclick = open;
  $('#cf-party-close').onclick = close;
  $('#cf-party-shell').addEventListener('click', event => {
    if (event.target.id === 'cf-party-shell') close();
  });
  $('#cf-create-room').onclick = () => requireUser(createRoom);
  $('#cf-join-room').onclick = () => requireUser(() => joinRoom($('#cf-room-input').value));
  $('#cf-copy-room').onclick = copyInvite;
  $('#cf-host-sync').onclick = hostSync;
  $('#cf-leave-room').onclick = leaveRoom;
  $('#cf-refresh-public').onclick = subscribePublicRooms;
  $('#cf-reply-cancel').onclick = clearReply;
  $('#cf-chat-form').onsubmit = event => {
    event.preventDefault();
    sendChat($('#cf-chat-input').value);
  };
  $('#cf-chat-input').addEventListener('input', markTyping);
  $('#cf-chat-input').addEventListener('blur', stopTyping);
  document.querySelectorAll('[data-react]').forEach(button => {
    button.onclick = () => sendReaction(button.dataset.react);
  });

  const queryRoom = new URLSearchParams(location.search).get('party');
  if (queryRoom) {
    $('#cf-room-input').value = queryRoom.toUpperCase();
    setTimeout(() => requireUser(() => joinRoom(queryRoom)), 1200);
  }
}

function open() {
  shell();
  $('#cf-party-shell').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function close() {
  $('#cf-party-shell')?.classList.remove('open');
  document.body.style.overflow = '';
}

function refs(id = roomId) {
  return window.db.collection(ROOMS).doc(id);
}

async function createRoom() {
  try {
    const media = currentMedia();
    if (!media) {
      toast('Buksan muna ang details ng movie o episode bago gumawa ng room.');
      return;
    }
    if (!window.db) {
      toast('Hindi pa handa ang Firebase. I-refresh ang page.');
      return;
    }

    const id = code();
    const currentUser = user();
    const selectedProfile = profile();
    const visibility = $('#cf-room-privacy')?.value || 'private';

    await refs(id).set({
      code: id,
      hostUid: currentUser.uid,
      hostName: selectedProfile.name || currentUser.displayName || 'Host',
      media,
      visibility,
      status: 'waiting',
      memberCount: 1,
      commandVersion: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await joinRoom(id);
    toast(`Room ${id} created.`);
  } catch (error) {
    console.error('Create room failed:', error);
    toast(error?.code === 'permission-denied'
      ? 'Permission denied: i-publish ang tamang Firestore rules.'
      : 'Hindi nagawa ang room. I-refresh at subukan muli.');
  }
}

async function joinRoom(rawCode) {
  try {
    const id = String(rawCode || '').trim().toUpperCase();
    if (id.length !== 6) {
      toast('Kailangan ng 6-character room code.');
      return;
    }

    const snapshot = await refs(id).get();
    if (!snapshot.exists) {
      toast('Hindi makita ang room na iyon.');
      return;
    }

    cleanup();
    roomId = id;
    roomData = snapshot.data();
    await upsertPresence();
    subscribe();
    history.replaceState({}, '', `${location.pathname}?party=${id}`);
    toast(`Joined room ${id}.`);
  } catch (error) {
    console.error('Join room failed:', error);
    toast(error?.code === 'permission-denied'
      ? 'Permission denied: tingnan ang Firestore rules.'
      : 'Hindi makapasok sa room ngayon.');
  }
}

async function upsertPresence(extra = {}) {
  if (!roomId || !user()) return;
  const currentUser = user();
  const selectedProfile = profile();

  await refs().collection('members').doc(currentUser.uid).set({
    name: selectedProfile.name || currentUser.displayName || 'Viewer',
    avatar: selectedProfile.avatar || currentUser.photoURL || 'icon-192.png',
    isHost: roomData?.hostUid === currentUser.uid,
    typing: false,
    typingAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    ...extra
  }, { merge: true });

  clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    refs().collection('members').doc(currentUser.uid).set({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  }, 25000);
}

function subscribe() {
  unsubRoom = refs().onSnapshot(snapshot => {
    if (!snapshot.exists) {
      toast('The party room has ended.');
      leaveRoom();
      return;
    }
    const previous = roomData;
    roomData = snapshot.data();
    renderRoom();
    if (previous && roomData.commandVersion > previous.commandVersion && roomData.hostUid !== user()?.uid) {
      applyCommand(roomData);
    }
  });

  unsubMembers = refs().collection('members').onSnapshot(snapshot => {
    latestMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMembers(latestMembers);
    renderTyping(latestMembers);
  });

  unsubChat = refs().collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(MAX_CHAT)
    .onSnapshot(snapshot => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderChat(messages);
      const newest = messages[messages.length - 1];
      if (newest?.reaction && newest.uid !== user()?.uid) showFloatingReaction(newest.text);
    });
}

function roomIsActive(room) {
  const timestamp = room?.updatedAt?.toDate ? room.updatedAt.toDate().getTime() : Date.now();
  return Date.now() - timestamp < 6 * 60 * 60 * 1000;
}

function subscribePublicRooms() {
  try {
    const list = $('#cf-public-list');
    if (!user()) {
      if (list) list.innerHTML = '<div class="cf-public-empty"><i class="fa-solid fa-lock"></i><span>Mag-login para makita ang public rooms.</span></div>';
      return;
    }
    if (unsubPublic) unsubPublic();
    unsubPublic = window.db.collection(ROOMS)
      .where('visibility', '==', 'public')
      .limit(20)
      .onSnapshot(snapshot => {
        const rooms = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(roomIsActive)
          .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
        renderPublicRooms(rooms);
      }, error => {
        console.warn('Public rooms listener failed', error);
        if (list) list.innerHTML = '<div class="cf-chat-empty">Public rooms are unavailable right now.</div>';
      });
  } catch (error) {
    console.warn(error);
  }
}

function renderPublicRooms(items) {
  const list = $('#cf-public-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="cf-public-empty"><i class="fa-solid fa-satellite-dish"></i><span>No public rooms yet. Create the first one!</span></div>';
    return;
  }

  list.innerHTML = items.map(room => {
    const media = room.media || {};
    const path = media.backdrop_path || media.poster_path || '';
    const background = path ? `https://image.tmdb.org/t/p/w500${path}` : '';
    return `
      <article class="cf-public-room" style="${background ? `--room-bg:url(${background})` : ''}">
        <div class="cf-public-room-body">
          <span class="cf-live-pill"><i></i> LIVE</span>
          <h4>${esc(media.title || 'CineFlex Party')}</h4>
          <p>Hosted by ${esc(room.hostName || 'CineFlex user')}</p>
          <div class="cf-public-meta">
            <span><i class="fa-solid fa-user-group"></i> ${Number(room.memberCount || 1)}</span>
            <span>${esc(room.code || room.id)}</span>
          </div>
          <button class="cf-party-btn primary cf-public-join" data-room="${esc(room.code || room.id)}">Join Room</button>
        </div>
      </article>`;
  }).join('');

  list.querySelectorAll('[data-room]').forEach(button => {
    button.onclick = () => requireUser(() => joinRoom(button.dataset.room));
  });
}

function renderRoom() {
  shell();
  const media = roomData?.media || {};
  $('#cf-party-code').textContent = roomId || 'NO ROOM';
  $('#cf-party-media-title').textContent = media.title || 'No title selected';
  $('#cf-party-host-note').textContent = `Hosted by ${roomData?.hostName || 'CineFlex user'}`;
  $('#cf-party-status').textContent = roomData?.status === 'playing'
    ? 'Party started • synchronized room active'
    : 'Room ready • waiting for host';
  $('#cf-party-sync-state').textContent = user()?.uid === roomData?.hostUid
    ? 'You are the host. Open the title and press Start / Resync.'
    : 'Host controls the shared title and sync command.';

  const path = media.backdrop_path || media.poster_path;
  $('#cf-party-hero').style.backgroundImage = path
    ? `linear-gradient(0deg,rgba(5,5,9,.9),rgba(5,5,9,.1)),url(https://image.tmdb.org/t/p/original${path})`
    : '';
  $('#cf-host-sync').style.display = user()?.uid === roomData?.hostUid ? 'inline-flex' : 'none';
  $('#cf-party-fab')?.classList.add('online');
}

function renderMembers(items) {
  const currentTime = Date.now();
  const active = items.filter(member => {
    const timestamp = nowMs(member.lastSeen) || currentTime;
    return currentTime - timestamp < ACTIVE_WINDOW_MS;
  });

  $('#cf-party-count').textContent = `${active.length} online`;
  $('#cf-chat-online').textContent = `${active.length} online`;
  $('#cf-party-members').innerHTML = active.map(member => `
    <span class="cf-party-member">
      <i class="cf-presence-dot"></i>
      <img src="${esc(member.avatar || 'icon-192.png')}" onerror="this.src='icon-192.png'" alt="">
      <span>${esc(member.name)}${member.id === roomData?.hostUid ? ' 👑' : ''}</span>
    </span>`).join('');

  if (roomId && user()?.uid === roomData?.hostUid) {
    refs().set({
      memberCount: active.length,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  }
}

function renderTyping(items) {
  const currentTime = Date.now();
  const names = items
    .filter(member => member.id !== user()?.uid && member.typing && currentTime - (nowMs(member.typingAt) || 0) < TYPING_WINDOW_MS)
    .map(member => member.name)
    .slice(0, 3);

  const indicator = $('#cf-typing');
  if (!indicator) return;
  if (!names.length) {
    indicator.hidden = true;
    indicator.textContent = '';
    return;
  }
  indicator.hidden = false;
  indicator.innerHTML = `<span>${esc(names.join(', '))}</span> ${names.length === 1 ? 'is' : 'are'} typing <i></i><i></i><i></i>`;
}

function renderChat(items) {
  const list = $('#cf-chat-list');
  if (!items.length) {
    list.innerHTML = '<div class="cf-chat-empty">No messages yet. Say hello!</div>';
    return;
  }

  list.innerHTML = items.map(message => {
    const mine = message.uid === user()?.uid;
    const reply = message.replyTo?.text ? `
      <div class="cf-chat-quoted">
        <strong>${esc(message.replyTo.name || 'Viewer')}</strong>
        <span>${esc(message.replyTo.text)}</span>
      </div>` : '';
    const timestamp = message.createdAt?.toDate
      ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    if (message.reaction) {
      return `
        <div class="cf-chat-reaction ${mine ? 'mine' : ''}" data-message-id="${esc(message.id)}">
          <span class="cf-chat-reaction-emoji">${esc(message.text)}</span>
          <small>${esc(message.name || 'Viewer')}</small>
        </div>`;
    }

    return `
      <div class="cf-chat-msg ${mine ? 'mine' : ''}" data-message-id="${esc(message.id)}">
        <img src="${esc(message.avatar || 'icon-192.png')}" onerror="this.src='icon-192.png'" alt="">
        <div class="cf-chat-content">
          <div class="cf-chat-bubble">
            ${reply}
            <b>${esc(message.name)}</b>
            <p>${esc(message.text)}</p>
            <time>${timestamp}</time>
          </div>
          <button class="cf-chat-reply-btn" type="button" data-reply-id="${esc(message.id)}"><i class="fa-solid fa-reply"></i> Reply</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-reply-id]').forEach(button => {
    button.onclick = () => {
      const message = items.find(item => item.id === button.dataset.replyId);
      if (message) setReply(message);
    };
  });

  list.scrollTop = list.scrollHeight;
}

function setReply(message) {
  replyTarget = {
    id: message.id,
    uid: message.uid,
    name: message.name || 'Viewer',
    text: String(message.text || '').slice(0, 120)
  };
  $('#cf-reply-name').textContent = replyTarget.name;
  $('#cf-reply-text').textContent = replyTarget.text;
  $('#cf-reply-preview').hidden = false;
  $('#cf-chat-input').focus();
}

function clearReply() {
  replyTarget = null;
  const preview = $('#cf-reply-preview');
  if (preview) preview.hidden = true;
}

async function markTyping() {
  if (!roomId || !user()) return;
  clearTimeout(typingTimer);
  await refs().collection('members').doc(user().uid).set({
    typing: true,
    typingAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(() => {});

  typingTimer = setTimeout(stopTyping, 2200);
}

async function stopTyping() {
  clearTimeout(typingTimer);
  if (!roomId || !user()) return;
  await refs().collection('members').doc(user().uid).set({
    typing: false,
    typingAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(() => {});
}

async function sendChat(text) {
  text = String(text || '').trim();
  if (!roomId || !user() || !text) return;

  const currentUser = user();
  const selectedProfile = profile();
  const payload = {
    uid: currentUser.uid,
    name: selectedProfile.name || currentUser.displayName || 'Viewer',
    avatar: selectedProfile.avatar || currentUser.photoURL || 'icon-192.png',
    text: text.slice(0, 280),
    reaction: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (replyTarget) payload.replyTo = replyTarget;

  try {
    await refs().collection('messages').add(payload);
    $('#cf-chat-input').value = '';
    clearReply();
    stopTyping();
  } catch (error) {
    console.error('Send chat failed:', error);
    toast('Hindi naipadala ang message.');
  }
}

async function sendReaction(emoji) {
  if (!roomId || !user()) {
    toast('Join a room first.');
    return;
  }

  showFloatingReaction(emoji);
  const currentUser = user();
  const selectedProfile = profile();
  try {
    await refs().collection('messages').add({
      uid: currentUser.uid,
      name: selectedProfile.name || currentUser.displayName || 'Viewer',
      avatar: selectedProfile.avatar || currentUser.photoURL || 'icon-192.png',
      text: String(emoji).slice(0, 8),
      reaction: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Send reaction failed:', error);
    toast('Hindi naipadala ang reaction.');
  }
}

function showFloatingReaction(emoji) {
  const stage = $('#cf-reaction-stage');
  if (!stage) return;
  const node = document.createElement('span');
  node.className = 'cf-floating-reaction';
  node.textContent = emoji;
  node.style.left = `${12 + Math.random() * 76}%`;
  node.style.setProperty('--drift', `${-45 + Math.random() * 90}px`);
  stage.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

async function hostSync() {
  if (!roomId || user()?.uid !== roomData?.hostUid) {
    toast('Host-only control.');
    return;
  }
  const media = currentMedia() || roomData.media;
  if (!media) {
    toast('Open the party movie first.');
    return;
  }
  await refs().set({
    media,
    status: 'playing',
    command: 'sync',
    commandVersion: Number(roomData.commandVersion || 0) + 1,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  toast('Sync command sent to everyone.');
}

async function applyCommand(data) {
  const media = data.media;
  if (!media?.id) return;
  toast(`Host started ${media.title}.`);
  try {
    if (!window.currentItem || window.currentItem.id !== media.id) {
      const details = await fetch(`${window.BASE_URL || 'https://api.themoviedb.org/3'}/${media.mediaType}/${media.id}?api_key=${window.API_KEY}&language=en-US`).then(response => response.json());
      details.media_type = media.mediaType;
      await window.showDetails(details);
    }
    if (media.mediaType === 'tv' && window.currentTVState) {
      window.currentTVState.currentSeason = media.season || 1;
      window.currentTVState.currentEpNum = media.episode || 1;
    }
    setTimeout(() => {
      if (typeof window.startPlayback === 'function') window.startPlayback();
    }, 500);
  } catch (error) {
    console.warn('Party sync could not open title', error);
  }
}

async function copyInvite() {
  if (!roomId) {
    toast('Create or join a room first.');
    return;
  }
  const url = `${location.origin}${location.pathname}?party=${roomId}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Invite link copied.');
  } catch {
    prompt('Copy this invite link:', url);
  }
}

async function leaveRoom() {
  const currentUser = user();
  if (roomId && currentUser) {
    await refs().collection('members').doc(currentUser.uid).delete().catch(() => {});
  }
  cleanup();
  roomId = '';
  roomData = null;
  latestMembers = [];
  clearReply();
  history.replaceState({}, '', location.pathname);
  $('#cf-party-fab')?.classList.remove('online');
  if ($('#cf-party-code')) {
    $('#cf-party-code').textContent = 'NO ROOM';
    $('#cf-party-media-title').textContent = 'Choose a movie, then create a party.';
    $('#cf-party-members').innerHTML = '';
    $('#cf-chat-list').innerHTML = '<div class="cf-chat-empty">Join a room to start chatting.</div>';
    $('#cf-typing').hidden = true;
  }
  toast('Left the Watch Party.');
}

function cleanup() {
  [unsubRoom, unsubChat, unsubMembers].forEach(unsubscribe => {
    try { if (unsubscribe) unsubscribe(); } catch {}
  });
  unsubRoom = unsubChat = unsubMembers = null;
  clearInterval(presenceTimer);
  clearTimeout(typingTimer);
}

window.addEventListener('beforeunload', () => {
  if (roomId && user()) refs().collection('members').doc(user().uid).delete().catch(() => {});
});

document.addEventListener('DOMContentLoaded', () => {
  shell();
  subscribePublicRooms();
  if (window.auth?.onAuthStateChanged) window.auth.onAuthStateChanged(() => subscribePublicRooms());
});

window.CineFlexParty = { open, createRoom, joinRoom, leaveRoom };
})();
