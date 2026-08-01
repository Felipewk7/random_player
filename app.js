/**
 * Random Video Player for GitHub Pages
 * Handles local recursive folder reading, random video queueing,
 * custom player controls (-5s/+5s, play/pause, next video), and shortcuts.
 * 
 * Optimized for Instant Playback & Zero-Lag Blob Streaming.
 */

(function () {
  'use strict';

  // DOM Elements
  const folderInput = document.getElementById('folderInput');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const dropzone = document.getElementById('dropzone');
  const playerWrapper = document.getElementById('playerWrapper');
  const videoContainer = document.getElementById('videoContainer');
  const mainVideo = document.getElementById('mainVideo');
  const bigPlayTarget = document.getElementById('bigPlayTarget');

  // Video Metadata UI
  const videoCountBadge = document.getElementById('videoCountBadge');
  const videoFolderPath = document.getElementById('videoFolderPath');
  const videoFileName = document.getElementById('videoFileName');
  const videoIndexBadge = document.getElementById('videoIndexBadge');

  // Controls UI
  const controlsOverlay = document.getElementById('controlsOverlay');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnRewind5 = document.getElementById('btnRewind5');
  const btnForward5 = document.getElementById('btnForward5');
  const btnPrevVideo = document.getElementById('btnPrevVideo');
  const btnNextVideo = document.getElementById('btnNextVideo');

  const seekSlider = document.getElementById('seekSlider');
  const progressFilled = document.getElementById('progressFilled');
  const progressBuffered = document.getElementById('progressBuffered');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const durationDisplay = document.getElementById('durationDisplay');
  const timeTooltip = document.getElementById('timeTooltip');
  const progressBarContainer = document.getElementById('progressBarContainer');

  const btnShuffleMode = document.getElementById('btnShuffleMode');
  const btnAutoNext = document.getElementById('btnAutoNext');
  const btnMute = document.getElementById('btnMute');
  const iconVolHigh = document.getElementById('iconVolHigh');
  const iconVolMute = document.getElementById('iconVolMute');
  const volumeSlider = document.getElementById('volumeSlider');
  const speedSelector = document.getElementById('speedSelector');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const iconExpand = document.getElementById('iconExpand');
  const iconCompress = document.getElementById('iconCompress');

  // Toast UI
  const toastNotification = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');

  // Drawer & Playlist UI
  const btnPlaylistToggle = document.getElementById('btnPlaylistToggle');
  const playlistDrawer = document.getElementById('playlistDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const drawerCount = document.getElementById('drawerCount');
  const playlistSearch = document.getElementById('playlistSearch');
  const playlistItems = document.getElementById('playlistItems');

  // Shortcuts Modal UI
  const btnShortcuts = document.getElementById('btnShortcuts');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Supported video extensions
  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.mkv', '.m4v', '.avi', '.ts', '.3gp'];

  // Application State
  let videoFiles = [];
  let playedHistory = []; // Array of indices played so far
  let historyPointer = -1; // Current index pointer within playedHistory
  let unplayedIndices = []; // Array of remaining unplayed indices for non-repeating shuffle

  let isShuffleNoRepeat = true;
  let isAutoNextEnabled = true;
  
  // Object URL Cache Management
  let activeObjectUrl = null;
  let activeIndex = -1;
  let pendingRevokeUrls = [];
  let errorSkipTimer = null;
  let idleTimer = null;

  // Init
  function init() {
    bindEvents();
  }

  function bindEvents() {
    // File Folder Input
    folderInput.addEventListener('change', handleFolderSelect);

    // Drag & Drop
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', handleDrop);

    // Player Controls
    btnPlayPause.addEventListener('click', togglePlayPause);
    bigPlayTarget.addEventListener('click', togglePlayPause);

    btnRewind5.addEventListener('click', () => skipTime(-5));
    btnForward5.addEventListener('click', () => skipTime(5));

    btnNextVideo.addEventListener('click', () => playNextVideo(true));
    btnPrevVideo.addEventListener('click', playPrevVideo);

    // Progress Bar & Video Events
    mainVideo.addEventListener('timeupdate', updateProgress);
    mainVideo.addEventListener('progress', updateBuffer);
    mainVideo.addEventListener('ended', handleVideoEnded);
    mainVideo.addEventListener('loadeddata', handleVideoLoadedData);
    mainVideo.addEventListener('error', handleVideoError);

    seekSlider.addEventListener('input', handleSeekInput);
    progressBarContainer.addEventListener('mousemove', handleSeekHover);

    // Settings
    btnShuffleMode.addEventListener('click', toggleShuffleMode);
    btnAutoNext.addEventListener('click', toggleAutoNext);

    // Volume & Speed
    btnMute.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', handleVolumeChange);
    speedSelector.addEventListener('change', (e) => {
      mainVideo.playbackRate = parseFloat(e.target.value);
      showToast(`Velocidade: ${e.target.value}x`);
    });

    // Fullscreen
    btnFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenIcons);

    // Idle Hide Controls
    videoContainer.addEventListener('mousemove', resetIdleTimer);
    videoContainer.addEventListener('mouseleave', hideControls);

    // Playlist Drawer
    btnPlaylistToggle.addEventListener('click', openPlaylistDrawer);
    btnCloseDrawer.addEventListener('click', closePlaylistDrawer);
    drawerOverlay.addEventListener('click', closePlaylistDrawer);
    playlistSearch.addEventListener('input', filterPlaylistItems);

    // Shortcuts Modal
    btnShortcuts.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
    });

    // Global Hotkeys
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  /* ----------------------------------------------------
   * File Reading & Queue Management
   * ---------------------------------------------------- */

  function isVideoFile(file) {
    if (!file || !file.name) return false;
    const nameLower = file.name.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => nameLower.endsWith(ext)) || file.type.startsWith('video/');
  }

  function handleFolderSelect(e) {
    const rawFiles = Array.from(e.target.files || []);
    processFiles(rawFiles);
  }

  async function handleDrop(e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    let files = [];

    if (items && items.length > 0) {
      const filePromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            filePromises.push(readEntryRecursively(entry));
          }
        } else if (item.kind === 'file') {
          files.push(item.getAsFile());
        }
      }
      const resolvedLists = await Promise.all(filePromises);
      resolvedLists.forEach(list => files.push(...list));
    } else {
      files = Array.from(e.dataTransfer.files || []);
    }

    processFiles(files);
  }

  // Recursive reader for DataTransfer entries
  function readEntryRecursively(entry, path = '') {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
          });
          resolve([file]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        let entries = [];
        
        const readEntries = () => {
          dirReader.readEntries(async (results) => {
            if (!results.length) {
              const promises = entries.map(child => readEntryRecursively(child, path + entry.name + '/'));
              const childLists = await Promise.all(promises);
              const allFiles = childLists.reduce((acc, curr) => acc.concat(curr), []);
              resolve(allFiles);
            } else {
              entries = entries.concat(Array.from(results));
              readEntries();
            }
          }, () => resolve([]));
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  }

  function processFiles(files) {
    videoFiles = files.filter(isVideoFile);

    if (videoFiles.length === 0) {
      alert('Nenhum arquivo de vídeo compatível foi encontrado na pasta selecionada.');
      return;
    }

    // Sort files by path for playlist listing
    videoFiles.sort((a, b) => {
      const pathA = a.webkitRelativePath || a.name;
      const pathB = b.webkitRelativePath || b.name;
      return pathA.localeCompare(pathB);
    });

    // Reset Queue States
    playedHistory = [];
    historyPointer = -1;
    resetUnplayedIndices();

    // Update UI
    videoCountBadge.textContent = `${videoFiles.length} vídeo${videoFiles.length > 1 ? 's' : ''}`;
    drawerCount.textContent = videoFiles.length;
    btnPlaylistToggle.disabled = false;

    welcomeScreen.classList.add('hidden');
    playerWrapper.classList.remove('hidden');

    renderPlaylist();
    playNextVideo(true); // Pick first random video
  }

  function resetUnplayedIndices() {
    unplayedIndices = Array.from({ length: videoFiles.length }, (_, i) => i);
  }

  /* ----------------------------------------------------
   * Video Selection Logic (Random & Navigation)
   * ---------------------------------------------------- */

  function playNextVideo(forceNewRandom = false) {
    if (videoFiles.length === 0) return;

    // Clear error auto-skip timer if user clicks next manually
    clearTimeout(errorSkipTimer);

    // If navigating back in history and forward is requested
    if (!forceNewRandom && historyPointer >= 0 && historyPointer < playedHistory.length - 1) {
      historyPointer++;
      loadVideo(playedHistory[historyPointer]);
      return;
    }

    // Pick a new random video index
    let nextIndex;
    if (isShuffleNoRepeat) {
      if (unplayedIndices.length === 0) {
        resetUnplayedIndices(); // Reset stack if all played
        showToast('Ciclo concluído! Reiniciando sorteio.');
      }
      const randomPos = Math.floor(Math.random() * unplayedIndices.length);
      nextIndex = unplayedIndices.splice(randomPos, 1)[0];
    } else {
      nextIndex = Math.floor(Math.random() * videoFiles.length);
    }

    playedHistory.push(nextIndex);
    historyPointer = playedHistory.length - 1;

    loadVideo(nextIndex);
  }

  function playPrevVideo() {
    clearTimeout(errorSkipTimer);
    if (historyPointer > 0) {
      historyPointer--;
      loadVideo(playedHistory[historyPointer]);
      showToast('Vídeo anterior');
    } else {
      showToast('Início do histórico');
    }
  }

  function loadVideo(index) {
    if (index < 0 || index >= videoFiles.length) return;

    activeIndex = index;
    const file = videoFiles[index];

    // Safely queue old Blob URL for revocation after new video starts buffering
    if (activeObjectUrl) {
      pendingRevokeUrls.push(activeObjectUrl);
    }

    // Create fresh object URL
    activeObjectUrl = URL.createObjectURL(file);

    // Clean player state before setting new src
    mainVideo.pause();
    mainVideo.src = activeObjectUrl;
    mainVideo.playbackRate = parseFloat(speedSelector.value);

    // Update Metadata Header
    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split('/');
    const folderName = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Pasta Principal';

    videoFolderPath.textContent = folderName;
    videoFileName.textContent = file.name;
    videoIndexBadge.textContent = `${index + 1} / ${videoFiles.length}`;

    highlightPlaylistItem(index);

    // Attempt playback
    mainVideo.play().then(() => {
      updatePlayPauseIcons(true);
    }).catch((err) => {
      // Browsers may block un-muted autoplay if user hasn't interacted yet
      console.log('Autoplay standard notice:', err);
      updatePlayPauseIcons(false);
    });
  }

  function handleVideoLoadedData() {
    // Revoke old URLs now that the current video has successfully initialized
    while (pendingRevokeUrls.length > 0) {
      const url = pendingRevokeUrls.shift();
      URL.revokeObjectURL(url);
    }
  }

  function handleVideoError(e) {
    console.warn('Video decoding or format error:', e, mainVideo.error);
    const failedFile = videoFiles[activeIndex];
    const fileName = failedFile ? failedFile.name : 'arquivo';
    
    showToast(`Formato não suportado: ${fileName}`);

    // Auto-skip unplayable video after 1.5s
    clearTimeout(errorSkipTimer);
    errorSkipTimer = setTimeout(() => {
      playNextVideo(true);
    }, 1500);
  }

  /* ----------------------------------------------------
   * Custom Player Controls
   * ---------------------------------------------------- */

  function togglePlayPause() {
    if (!mainVideo.src) return;
    if (mainVideo.paused) {
      mainVideo.play();
      updatePlayPauseIcons(true);
      showToast('Play');
    } else {
      mainVideo.pause();
      updatePlayPauseIcons(false);
      showToast('Pause');
    }
  }

  function updatePlayPauseIcons(isPlaying) {
    if (isPlaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }

  function skipTime(seconds) {
    if (!mainVideo.duration) return;
    mainVideo.currentTime = Math.min(Math.max(mainVideo.currentTime + seconds, 0), mainVideo.duration);
    const sign = seconds > 0 ? '+' : '';
    showToast(`${sign}${seconds}s`);
  }

  function handleVideoEnded() {
    if (isAutoNextEnabled) {
      playNextVideo(true);
    } else {
      updatePlayPauseIcons(false);
    }
  }

  function updateProgress() {
    if (!mainVideo.duration) return;
    const current = mainVideo.currentTime;
    const duration = mainVideo.duration;
    const percent = (current / duration) * 100;

    seekSlider.value = percent;
    progressFilled.style.width = `${percent}%`;

    currentTimeDisplay.textContent = formatTime(current);
    durationDisplay.textContent = formatTime(duration);
  }

  function updateBuffer() {
    if (!mainVideo.duration || mainVideo.buffered.length === 0) return;
    const bufferedEnd = mainVideo.buffered.end(mainVideo.buffered.length - 1);
    const duration = mainVideo.duration;
    const percent = (bufferedEnd / duration) * 100;
    progressBuffered.style.width = `${percent}%`;
  }

  function handleSeekInput() {
    if (!mainVideo.duration) return;
    const seekTo = (seekSlider.value / 100) * mainVideo.duration;
    mainVideo.currentTime = seekTo;
  }

  function handleSeekHover(e) {
    if (!mainVideo.duration) return;
    const rect = progressBarContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const hoverTime = Math.max(0, Math.min(pos * mainVideo.duration, mainVideo.duration));
    timeTooltip.textContent = formatTime(hoverTime);
    timeTooltip.style.left = `${e.clientX - rect.left}px`;
  }

  function toggleMute() {
    mainVideo.muted = !mainVideo.muted;
    if (mainVideo.muted) {
      iconVolHigh.classList.add('hidden');
      iconVolMute.classList.remove('hidden');
      showToast('Mudo');
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolMute.classList.add('hidden');
      showToast(`Volume: ${Math.round(mainVideo.volume * 100)}%`);
    }
  }

  function handleVolumeChange() {
    const val = parseFloat(volumeSlider.value);
    mainVideo.volume = val;
    mainVideo.muted = val === 0;
    if (val === 0) {
      iconVolHigh.classList.add('hidden');
      iconVolMute.classList.remove('hidden');
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolMute.classList.add('hidden');
    }
  }

  function toggleShuffleMode() {
    isShuffleNoRepeat = !isShuffleNoRepeat;
    btnShuffleMode.classList.toggle('active', isShuffleNoRepeat);
    showToast(isShuffleNoRepeat ? 'Sem Repetição: Ativado' : 'Sem Repetição: Desativado');
  }

  function toggleAutoNext() {
    isAutoNextEnabled = !isAutoNextEnabled;
    btnAutoNext.classList.toggle('active', isAutoNextEnabled);
    showToast(isAutoNextEnabled ? 'Auto-Avançar: Ativado' : 'Auto-Avançar: Desativado');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }

  function updateFullscreenIcons() {
    if (document.fullscreenElement) {
      iconExpand.classList.add('hidden');
      iconCompress.classList.remove('hidden');
    } else {
      iconExpand.classList.remove('hidden');
      iconCompress.classList.add('hidden');
    }
  }

  /* ----------------------------------------------------
   * Idle Controls Hiding & Toast Notifications
   * ---------------------------------------------------- */

  function resetIdleTimer() {
    videoContainer.classList.remove('idle');
    clearTimeout(idleTimer);
    if (!mainVideo.paused) {
      idleTimer = setTimeout(() => {
        videoContainer.classList.add('idle');
      }, 3000);
    }
  }

  function hideControls() {
    if (!mainVideo.paused) {
      videoContainer.classList.add('idle');
    }
  }

  let toastTimeout = null;
  function showToast(message) {
    toastText.textContent = message;
    toastNotification.classList.remove('hidden');
    toastNotification.style.animation = 'none';
    void toastNotification.offsetWidth;
    toastNotification.style.animation = 'toastFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 1200);
  }

  /* ----------------------------------------------------
   * Playlist Sidebar Drawer
   * ---------------------------------------------------- */

  function openPlaylistDrawer() {
    playlistDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
  }

  function closePlaylistDrawer() {
    playlistDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
  }

  function renderPlaylist() {
    playlistItems.innerHTML = '';
    videoFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'playlist-item';
      li.dataset.index = index;

      const fullPath = file.webkitRelativePath || file.name;

      li.innerHTML = `
        <span class="playlist-item-title">${file.name}</span>
        <span class="playlist-item-path">${fullPath}</span>
      `;

      li.addEventListener('click', () => {
        playedHistory.push(index);
        historyPointer = playedHistory.length - 1;
        loadVideo(index);
        closePlaylistDrawer();
      });

      playlistItems.appendChild(li);
    });
  }

  function filterPlaylistItems() {
    const query = playlistSearch.value.toLowerCase();
    const items = playlistItems.querySelectorAll('.playlist-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });
  }

  function highlightPlaylistItem(index) {
    const items = playlistItems.querySelectorAll('.playlist-item');
    items.forEach(item => {
      const itemIdx = parseInt(item.dataset.index, 10);
      if (itemIdx === index) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  /* ----------------------------------------------------
   * Keyboard Shortcuts Handler
   * ---------------------------------------------------- */

  function handleGlobalKeydown(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        togglePlayPause();
        break;

      case 'ArrowLeft':
      case 'KeyJ':
        e.preventDefault();
        skipTime(-5);
        break;

      case 'ArrowRight':
      case 'KeyL':
        e.preventDefault();
        skipTime(5);
        break;

      case 'KeyN':
        e.preventDefault();
        playNextVideo(true);
        showToast('Próximo Vídeo');
        break;

      case 'KeyP':
        e.preventDefault();
        playPrevVideo();
        break;

      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;

      case 'KeyM':
        e.preventDefault();
        toggleMute();
        break;

      case 'ArrowUp':
        e.preventDefault();
        volumeSlider.value = Math.min(parseFloat(volumeSlider.value) + 0.1, 1);
        handleVolumeChange();
        showToast(`Volume: ${Math.round(volumeSlider.value * 100)}%`);
        break;

      case 'ArrowDown':
        e.preventDefault();
        volumeSlider.value = Math.max(parseFloat(volumeSlider.value) - 0.1, 0);
        handleVolumeChange();
        showToast(`Volume: ${Math.round(volumeSlider.value * 100)}%`);
        break;
    }
  }

  /* ----------------------------------------------------
   * Helpers
   * ---------------------------------------------------- */

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = num => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  // Run app
  document.addEventListener('DOMContentLoaded', init);
})();
