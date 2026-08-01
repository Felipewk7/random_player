/**
 * Random Video Player for GitHub Pages
 * Features dual modes:
 *  1. Web Player: Watch directly inside the browser.
 *  2. Native Sorteador: Pick random videos & launch them in your PC's native player (VLC / Windows Media Player) with 0 downloading!
 */

(function () {
  'use strict';

  // DOM Elements
  const folderInput = document.getElementById('folderInput');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const dropzone = document.getElementById('dropzone');
  
  // Mode Switcher
  const btnModeWeb = document.getElementById('btnModeWeb');
  const btnModeNative = document.getElementById('btnModeNative');
  
  // Web Player Stage
  const playerWrapper = document.getElementById('playerWrapper');
  const videoContainer = document.getElementById('videoContainer');
  const mainVideo = document.getElementById('mainVideo');
  const bigPlayTarget = document.getElementById('bigPlayTarget');

  // Native Picker Stage
  const nativePickerStage = document.getElementById('nativePickerStage');
  const nativeFolderPath = document.getElementById('nativeFolderPath');
  const nativeFileName = document.getElementById('nativeFileName');
  const nativeFileSize = document.getElementById('nativeFileSize');
  const baseFolderPathInput = document.getElementById('baseFolderPathInput');
  const btnOpenVlc = document.getElementById('btnOpenVlc');
  const btnOpenWinRun = document.getElementById('btnOpenWinRun');
  const btnNativeNext = document.getElementById('btnNativeNext');

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
  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.mkv', '.m4v', '.avi', '.ts', '.3gp', '.flv', '.vob', '.wmv'];

  // Application State
  let videoFiles = [];
  let playedHistory = [];
  let historyPointer = -1;
  let unplayedIndices = [];

  let currentMode = 'web';
  let isShuffleNoRepeat = true;
  let isAutoNextEnabled = true;
  
  // Object URL & State
  let activeObjectUrl = null;
  let activeIndex = -1;
  let pendingRevokeUrls = [];
  let errorSkipTimer = null;
  let idleTimer = null;

  // Init
  function init() {
    loadSavedBasePath();
    bindEvents();
  }

  function loadSavedBasePath() {
    const saved = localStorage.getItem('userBaseFolderPath');
    if (saved) {
      baseFolderPathInput.value = saved;
    }
  }

  function bindEvents() {
    // Mode Switcher
    btnModeWeb.addEventListener('click', () => setAppMode('web'));
    btnModeNative.addEventListener('click', () => setAppMode('native'));

    // Base Path Persistence
    baseFolderPathInput.addEventListener('input', (e) => {
      localStorage.setItem('userBaseFolderPath', e.target.value.trim());
    });

    // Folder Inputs
    folderInput.addEventListener('change', handleFolderSelect);

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', handleDrop);

    // Native Launcher Buttons
    btnOpenVlc.addEventListener('click', launchInVlcDirect);
    btnOpenWinRun.addEventListener('click', copyWindowsRunCommand);
    btnNativeNext.addEventListener('click', () => playNextVideo(true));

    // Web Player Controls
    btnPlayPause.addEventListener('click', togglePlayPause);
    bigPlayTarget.addEventListener('click', togglePlayPause);

    btnRewind5.addEventListener('click', () => skipTime(-5));
    btnForward5.addEventListener('click', () => skipTime(5));

    btnNextVideo.addEventListener('click', () => playNextVideo(true));
    btnPrevVideo.addEventListener('click', playPrevVideo);

    mainVideo.addEventListener('timeupdate', updateProgress);
    mainVideo.addEventListener('progress', updateBuffer);
    mainVideo.addEventListener('ended', handleVideoEnded);
    mainVideo.addEventListener('loadeddata', handleVideoLoadedData);
    mainVideo.addEventListener('error', handleVideoError);

    seekSlider.addEventListener('input', handleSeekInput);
    progressBarContainer.addEventListener('mousemove', handleSeekHover);

    btnShuffleMode.addEventListener('click', toggleShuffleMode);
    btnAutoNext.addEventListener('click', toggleAutoNext);

    btnMute.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', handleVolumeChange);
    speedSelector.addEventListener('change', (e) => {
      mainVideo.playbackRate = parseFloat(e.target.value);
      showToast(`Velocidade: ${e.target.value}x`);
    });

    btnFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenIcons);

    videoContainer.addEventListener('mousemove', resetIdleTimer);
    videoContainer.addEventListener('mouseleave', hideControls);

    btnPlaylistToggle.addEventListener('click', openPlaylistDrawer);
    btnCloseDrawer.addEventListener('click', closePlaylistDrawer);
    drawerOverlay.addEventListener('click', closePlaylistDrawer);
    playlistSearch.addEventListener('input', filterPlaylistItems);

    btnShortcuts.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
    });

    document.addEventListener('keydown', handleGlobalKeydown);
  }

  /* ----------------------------------------------------
   * App Mode Switcher
   * ---------------------------------------------------- */

  function setAppMode(mode) {
    currentMode = mode;
    btnModeWeb.classList.toggle('active', mode === 'web');
    btnModeNative.classList.toggle('active', mode === 'native');

    if (videoFiles.length > 0) {
      if (mode === 'web') {
        nativePickerStage.classList.add('hidden');
        playerWrapper.classList.remove('hidden');
        if (activeIndex >= 0) loadVideo(activeIndex);
      } else {
        playerWrapper.classList.add('hidden');
        mainVideo.pause();
        nativePickerStage.classList.remove('hidden');
        if (activeIndex >= 0) updateNativePickerUI(activeIndex);
      }
    }
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

    videoFiles.sort((a, b) => {
      const pathA = a.webkitRelativePath || a.name;
      const pathB = b.webkitRelativePath || b.name;
      return pathA.localeCompare(pathB);
    });

    playedHistory = [];
    historyPointer = -1;
    resetUnplayedIndices();

    videoCountBadge.textContent = `${videoFiles.length} vídeo${videoFiles.length > 1 ? 's' : ''}`;
    drawerCount.textContent = videoFiles.length;
    btnPlaylistToggle.disabled = false;

    welcomeScreen.classList.add('hidden');

    if (currentMode === 'web') {
      playerWrapper.classList.remove('hidden');
      nativePickerStage.classList.add('hidden');
    } else {
      playerWrapper.classList.add('hidden');
      nativePickerStage.classList.remove('hidden');
    }

    renderPlaylist();
    playNextVideo(true);
  }

  function resetUnplayedIndices() {
    unplayedIndices = Array.from({ length: videoFiles.length }, (_, i) => i);
  }

  /* ----------------------------------------------------
   * Video Selection Logic
   * ---------------------------------------------------- */

  function playNextVideo(forceNewRandom = false) {
    if (videoFiles.length === 0) return;

    clearTimeout(errorSkipTimer);

    if (!forceNewRandom && historyPointer >= 0 && historyPointer < playedHistory.length - 1) {
      historyPointer++;
      const idx = playedHistory[historyPointer];
      if (currentMode === 'web') loadVideo(idx);
      else updateNativePickerUI(idx);
      return;
    }

    let nextIndex;
    if (isShuffleNoRepeat) {
      if (unplayedIndices.length === 0) {
        resetUnplayedIndices();
        showToast('Ciclo concluído! Reiniciando sorteio.');
      }
      const randomPos = Math.floor(Math.random() * unplayedIndices.length);
      nextIndex = unplayedIndices.splice(randomPos, 1)[0];
    } else {
      nextIndex = Math.floor(Math.random() * videoFiles.length);
    }

    playedHistory.push(nextIndex);
    historyPointer = playedHistory.length - 1;

    if (currentMode === 'web') {
      loadVideo(nextIndex);
    } else {
      updateNativePickerUI(nextIndex);
    }
  }

  function playPrevVideo() {
    clearTimeout(errorSkipTimer);

    if (historyPointer > 0) {
      historyPointer--;
      const idx = playedHistory[historyPointer];
      if (currentMode === 'web') loadVideo(idx);
      else updateNativePickerUI(idx);
      showToast('Vídeo anterior');
    } else {
      showToast('Início do histórico');
    }
  }

  function updateNativePickerUI(index) {
    if (index < 0 || index >= videoFiles.length) return;

    activeIndex = index;
    const file = videoFiles[index];

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split('/');
    const folderName = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Pasta Principal';

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

    nativeFolderPath.textContent = folderName;
    nativeFileName.textContent = file.name;
    nativeFileSize.textContent = `${sizeMB} MB`;

    highlightPlaylistItem(index);
    showToast(`Sorteado: ${file.name}`);
  }

  function loadVideo(index) {
    if (index < 0 || index >= videoFiles.length) return;

    activeIndex = index;
    const file = videoFiles[index];

    if (activeObjectUrl) {
      pendingRevokeUrls.push(activeObjectUrl);
    }

    activeObjectUrl = URL.createObjectURL(file);

    mainVideo.pause();
    mainVideo.src = activeObjectUrl;
    mainVideo.playbackRate = parseFloat(speedSelector.value);

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split('/');
    const folderName = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Pasta Principal';

    videoFolderPath.textContent = folderName;
    videoFileName.textContent = file.name;
    videoIndexBadge.textContent = `${index + 1} / ${videoFiles.length}`;

    highlightPlaylistItem(index);

    mainVideo.play().then(() => {
      updatePlayPauseIcons(true);
    }).catch((err) => {
      console.log('Autoplay notice:', err);
      updatePlayPauseIcons(false);
    });
  }

  function handleVideoLoadedData() {
    while (pendingRevokeUrls.length > 0) {
      const url = pendingRevokeUrls.shift();
      URL.revokeObjectURL(url);
    }
  }

  /* ----------------------------------------------------
   * Zero-Download Native Launchers (VLC protocol & Windows Run command)
   * ---------------------------------------------------- */

  function getFullLocalWindowsPath(file) {
    if (!file) return '';
    let basePath = baseFolderPathInput.value.trim();
    if (!basePath) {
      basePath = 'C:\\SuaPasta';
    }
    // Remove trailing slash if present
    basePath = basePath.replace(/[/\\]+$/, '');

    const relPath = (file.webkitRelativePath || file.name).replace(/\//g, '\\');
    return `${basePath}\\${relPath}`;
  }

  function launchInVlcDirect() {
    const file = videoFiles[activeIndex];
    if (!file) return;

    const fullPath = getFullLocalWindowsPath(file);
    if (!baseFolderPathInput.value.trim()) {
      showToast('Digite a pasta base do seu PC no campo acima!');
      baseFolderPathInput.focus();
      return;
    }

    // Windows VLC protocol scheme: vlc://file:///C:/path/video.mp4
    const formattedPath = fullPath.replace(/\\/g, '/');
    const vlcUri = `vlc://file:///${encodeURI(formattedPath)}`;

    window.location.href = vlcUri;
    showToast(`Abrindo no VLC: ${file.name}`);
  }

  function copyWindowsRunCommand() {
    const file = videoFiles[activeIndex];
    if (!file) return;

    const fullPath = getFullLocalWindowsPath(file);
    const cmd = `start "" "${fullPath}"`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(() => {
        showToast('Comando copiado! Pressione Win+R e Ctrl+V');
      }).catch(() => fallbackCopyText(cmd));
    } else {
      fallbackCopyText(cmd);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Comando copiado! Pressione Win+R e Ctrl+V');
    } catch (err) {
      showToast('Erro ao copiar.');
    }
    document.body.removeChild(textArea);
  }

  /* ----------------------------------------------------
   * Web Player Error Handling
   * ---------------------------------------------------- */

  function handleVideoError(e) {
    const failedFile = videoFiles[activeIndex];
    if (!failedFile) return;

    const fileSizeMB = (failedFile.size / (1024 * 1024)).toFixed(1);
    console.warn(`Native playback error for (${failedFile.name}, ${fileSizeMB} MB):`, mainVideo.error);

    showToast(`Formato não suportado no navegador (${failedFile.name}). Pulando...`);
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
    }, 1500);
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
        if (currentMode === 'web') loadVideo(index);
        else updateNativePickerUI(index);
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

  document.addEventListener('DOMContentLoaded', init);
})();
