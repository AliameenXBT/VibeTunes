// ========== STATE ==========
let isPlaying = false;
let songs = [];
let currentIndex = 0;
let audio = null;

let isShuffle = false;
let isLoop = false;
let favorites = [];
let recentlyPlayed = [];

// Deezer API + CORS proxy
const DEEZER_URL = "https://api.deezer.com/search?q=lofi";
const CORS_PROXY = "https://proxy.corsfix.com/?";
const FAVORITES_KEY = "vibetunes_favorites";

// ========== DOM READY ==========
document.addEventListener("DOMContentLoaded", () => {
  const playPauseButton = document.getElementById("play-pause-button");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const shuffleButton = document.getElementById("shuffle-button");
  const loopButton = document.getElementById("loop-button");
  const favoriteButton = document.getElementById("favorite-button");
  const volumeSlider = document.getElementById("volume-slider");
  const progressBar = document.getElementById("progress-bar");
  const progressTrack = document.querySelector(".progress-track");
  const currentTimeEl = document.getElementById("current-time");
  const totalTimeEl = document.getElementById("total-time");
  const topTracksContainer = document.getElementById("top-tracks-container");
  const miniPlayPause = document.getElementById("mini-play-pause");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const toggleLyricsBtn = document.getElementById("toggle-lyrics");
  const lyricsContent = document.getElementById("lyrics-content");

  // Loading text for top tracks
  if (topTracksContainer) {
    topTracksContainer.innerHTML =
      '<p class="loading-text">Loading tracks...</p>';
  }

  // Create audio element
  audio = new Audio();
  audio.volume = 0.8;

  // Audio events
  audio.addEventListener("ended", () => {
    if (isLoop) {
      audio.currentTime = 0;
      playCurrentSong();
    } else {
      nextSong(true);
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (progressBar) progressBar.style.width = "0%";
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    if (progressBar) progressBar.style.width = percent + "%";
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  // Main play/pause button
  if (playPauseButton) {
    playPauseButton.addEventListener("click", () => {
      if (!audio || songs.length === 0) return;
      isPlaying ? pauseCurrentSong() : playCurrentSong();
    });
  }

  // Mini-player play/pause
  if (miniPlayPause) {
    miniPlayPause.addEventListener("click", () => {
      if (!audio || songs.length === 0) return;
      isPlaying ? pauseCurrentSong() : playCurrentSong();
    });
  }

  // Prev / Next
  if (prevButton) {
    prevButton.addEventListener("click", () => prevSong(true));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => nextSong(true));
  }

  // Shuffle / Loop toggles
  if (shuffleButton) {
    shuffleButton.addEventListener("click", () => {
      isShuffle = !isShuffle;
      shuffleButton.classList.toggle("active", isShuffle);
    });
  }

  if (loopButton) {
    loopButton.addEventListener("click", () => {
      isLoop = !isLoop;
      loopButton.classList.toggle("active", isLoop);
    });
  }

  // Favorites button
  if (favoriteButton) {
    favoriteButton.addEventListener("click", () => {
      toggleFavoriteForCurrent();
    });
  }

  // Volume slider
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && audio) audio.volume = v;
    });
  }

  // Click-to-seek on progress bar
  if (progressTrack) {
    progressTrack.addEventListener("click", (event) => {
      if (!audio || !audio.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const ratio = clickX / rect.width;
      audio.currentTime = ratio * audio.duration;
    });
  }

  // Keyboard controls
  document.addEventListener("keydown", (event) => {
    if (!audio || songs.length === 0) return;

    if (event.code === "Space") {
      event.preventDefault();
      isPlaying ? pauseCurrentSong() : playCurrentSong();
    }

    if (event.code === "ArrowRight" && audio.duration) {
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
    }

    if (event.code === "ArrowLeft") {
      audio.currentTime = Math.max(audio.currentTime - 5, 0);
    }
  });

  // Fullscreen toggle
  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", toggleFullscreen);
  }

  // Lyrics show/hide
  if (toggleLyricsBtn && lyricsContent) {
    toggleLyricsBtn.addEventListener("click", () => {
      const hidden = lyricsContent.classList.toggle("hidden");
      toggleLyricsBtn.textContent = hidden ? "Show" : "Hide";
    });
  }

  // Load favorites from localStorage
  loadFavoritesFromStorage();

  // Fetch songs
  fetchSongsFromDeezer();
});

// ========== FETCH SONGS ==========
function fetchSongsFromDeezer() {
  fetch(CORS_PROXY + DEEZER_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP error: " + res.status);
      return res.json();
    })
    .then((data) => {
      songs = data.data.map((track) => ({
        title: track.title,
        artist: track.artist.name,
        preview: track.preview,
        cover: track.album.cover,
      }));
      songs = songs.slice(0, 5);
      console.log("Songs:", songs);

      if (songs.length > 0) {
        setCurrentSong(0, false);
        renderTopTracks();
        renderQueue();
      }
    })
    .catch((err) => {
      console.error("Error fetching Deezer songs:", err);
      alert("Couldn't load Deezer songs. Check console/logs.");
    });
}

// ========== SET CURRENT SONG ==========
function setCurrentSong(index, autoplay = false) {
  if (!songs || songs.length === 0) return;

  currentIndex = index;
  const currentSong = songs[currentIndex];

  const songTitleEl = document.getElementById("song-title");
  const artistNameEl = document.getElementById("artist-name");
  const albumCoverImg = document.getElementById("album-cover-img");
  const currentTimeEl = document.getElementById("current-time");
  const progressBar = document.getElementById("progress-bar");
  const miniTitle = document.getElementById("mini-title");
  const miniArtist = document.getElementById("mini-artist");

  if (songTitleEl) songTitleEl.textContent = currentSong.title;
  if (artistNameEl) artistNameEl.textContent = currentSong.artist;

  if (albumCoverImg) {
    albumCoverImg.src = currentSong.cover;
    albumCoverImg.alt = currentSong.title + " cover";
  }

  if (miniTitle) miniTitle.textContent = currentSong.title;
  if (miniArtist) miniArtist.textContent = currentSong.artist;

  if (audio) {
    audio.src = currentSong.preview;

    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (progressBar) progressBar.style.width = "0%";

    if (autoplay) {
      playCurrentSong();
    } else {
      isPlaying = false;
      updatePlayPauseIcon();
    }
  }

  updateFavoriteIcon();
  updateLyrics(currentSong);
  renderQueue();
}

// ========== RENDER TOP TRACKS ==========
function renderTopTracks() {
  const container = document.getElementById("top-tracks-container");
  if (!container) return;

  container.innerHTML = "";

  songs.forEach((track, index) => {
    const card = document.createElement("div");
    card.className = "track-card";
    card.id = `track-${index}`;

    card.innerHTML = `
      <div class="track-art">
        <div class="track-art-overlay"></div>
        <img src="${track.cover}" alt="${track.title}" class="track-cover-img" />
      </div>
      <p class="track-title">${track.title}</p>
      <p class="track-artist">${track.artist}</p>
    `;

    card.addEventListener("click", () => setCurrentSong(index, true));

    container.appendChild(card);
  });
}

// ========== QUEUE (UP NEXT) ==========
function renderQueue() {
  const container = document.getElementById("queue-container");
  const emptyText = document.getElementById("queue-empty");
  if (!container) return;

  container.innerHTML = "";

  if (!songs.length) {
    if (emptyText) emptyText.style.display = "block";
    return;
  }

  if (emptyText) emptyText.style.display = "none";

  // Everything except currentIndex is "Up Next"
  const queue = songs
    .map((s, i) => ({ ...s, index: i }))
    .filter((item) => item.index !== currentIndex);

  if (!queue.length) {
    container.innerHTML =
      '<p class="queue-empty">No more songs in the queue.</p>';
    return;
  }

  queue.forEach((item) => {
    const card = document.createElement("div");
    card.className = "queue-item";

    card.innerHTML = `
      <div class="queue-cover">
        <img src="${item.cover}" alt="${item.title}" />
      </div>
      <div class="queue-texts">
        <span class="queue-title-text">${item.title}</span>
        <span class="queue-artist-text">${item.artist}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      setCurrentSong(item.index, true);
    });

    container.appendChild(card);
  });
}

// ========== PLAY / PAUSE ==========
function playCurrentSong() {
  if (!audio || songs.length === 0) return;

  audio
    .play()
    .then(() => {
      isPlaying = true;
      updatePlayPauseIcon();
      addToRecentlyPlayed(songs[currentIndex]);
      console.log("Playing:", songs[currentIndex]?.title);
    })
    .catch((err) => {
      console.error("Error playing audio:", err);
    });
}

function pauseCurrentSong() {
  if (!audio) return;
  audio.pause();
  isPlaying = false;
  updatePlayPauseIcon();
  console.log("Paused");
}

function updatePlayPauseIcon() {
  const playPauseIcon = document.getElementById("play-pause-icon");
  const miniPlayIcon = document.getElementById("mini-play-icon");
  const symbol = isPlaying ? "⏸" : "▶";
  if (playPauseIcon) playPauseIcon.textContent = symbol;
  if (miniPlayIcon) miniPlayIcon.textContent = symbol;
}

// ========== NEXT / PREV ==========
function nextSong(autoplay = true) {
  if (songs.length === 0) return;

  let nextIndex;
  if (isShuffle && songs.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * songs.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + 1) % songs.length;
  }

  setCurrentSong(nextIndex, autoplay);
}

function prevSong(autoplay = true) {
  if (songs.length === 0) return;
  const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
  setCurrentSong(prevIndex, autoplay);
}

// ========== FAVORITES + LOCALSTORAGE ==========
function getSongKey(song) {
  return song.preview || song.title + "|" + song.artist;
}

function isCurrentFavorite() {
  if (!songs.length) return false;
  const key = getSongKey(songs[currentIndex]);
  return favorites.includes(key);
}

function toggleFavoriteForCurrent() {
  if (!songs.length) return;
  const key = getSongKey(songs[currentIndex]);
  const index = favorites.indexOf(key);

  if (index === -1) favorites.push(key);
  else favorites.splice(index, 1);

  saveFavoritesToStorage();
  updateFavoriteIcon();
}

function updateFavoriteIcon() {
  const favoriteButton = document.getElementById("favorite-button");
  const favoriteIcon = document.getElementById("favorite-icon");
  const fav = isCurrentFavorite();
  if (favoriteButton) favoriteButton.classList.toggle("active", fav);
  if (favoriteIcon) favoriteIcon.textContent = fav ? "❤" : "♡";
}

function loadFavoritesFromStorage() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) favorites = JSON.parse(stored);
  } catch (err) {
    console.warn("Could not load favorites from storage:", err);
  }
}

function saveFavoritesToStorage() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.warn("Could not save favorites to storage:", err);
  }
}

// ========== RECENTLY PLAYED ==========
function addToRecentlyPlayed(song) {
  const key = getSongKey(song);
  recentlyPlayed = recentlyPlayed.filter((item) => getSongKey(item) !== key);
  recentlyPlayed.unshift(song);
  if (recentlyPlayed.length > 6) recentlyPlayed.pop();
  renderRecentlyPlayed();
}

function renderRecentlyPlayed() {
  const container = document.getElementById("recently-played-container");
  const emptyText = document.getElementById("recently-empty");
  if (!container) return;

  container.innerHTML = "";

  if (!recentlyPlayed.length) {
    if (emptyText) emptyText.style.display = "block";
    return;
  }
  if (emptyText) emptyText.style.display = "none";

  recentlyPlayed.forEach((track, index) => {
    const card = document.createElement("div");
    card.className = "recent-card";
    card.id = `recent-${index}`;

    card.innerHTML = `
      <div class="recent-art">
        <img src="${track.cover}" alt="${track.title}" class="recent-cover-img" />
      </div>
      <p class="recent-title">${track.title}</p>
      <p class="recent-artist">${track.artist}</p>
    `;

    card.addEventListener("click", () => {
      const songIndex = songs.findIndex(
        (s) => getSongKey(s) === getSongKey(track)
      );
      if (songIndex !== -1) setCurrentSong(songIndex, true);
    });

    container.appendChild(card);
  });
}

// ========== LYRICS (FAKE / TEMPLATE) ==========
function updateLyrics(song) {
  const lyricsEl = document.getElementById("lyrics-text");
  if (!lyricsEl || !song) return;

  lyricsEl.textContent = generateLyricsText(song.title, song.artist);
}

function generateLyricsText(title, artist) {
  return (
    `[Intro]\n` +
    `${title} - ${artist}\n\n` +
    `[Verse]\n` +
    `Late night vibes, neon in the sky,\n` +
    `Scrolling through the city while the world goes by.\n` +
    `Heartbeat synced to the bass in my ears,\n` +
    `Every little moment playing back for years.\n\n` +
    `[Chorus]\n` +
    `${title}, on repeat in my room,\n` +
    `Every note lighting up the gloom.\n` +
    `If you feel this wave, don't press skip,\n` +
    `Let the rhythm hold you in its grip.\n\n` +
    `[Outro]\n` +
    `Fading lights, but the song stays on,\n` +
    `In the back of my mind, even when it's gone.`
  );
}

// ========== FULLSCREEN ==========
function toggleFullscreen() {
  const app = document.querySelector(".app");
  if (!app) return;

  if (!document.fullscreenElement) {
    if (app.requestFullscreen) app.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

// ========== UTILS ==========
function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ":" + String(secs).padStart(2, "0");
}
