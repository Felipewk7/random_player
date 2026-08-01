/**
 * Sorteador de Vídeos Aleatórios para GitHub Pages
 * Lê recursivamente pastas e subpastas locais e sorteia vídeos instantaneamente.
 */

(function () {
  'use strict';

  // DOM Elements
  const folderInput = document.getElementById('folderInput');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const dropzone = document.getElementById('dropzone');
  
  const pickerStage = document.getElementById('pickerStage');
  const drawFolderPath = document.getElementById('drawFolderPath');
  const drawFileName = document.getElementById('drawFileName');
  const drawFileSize = document.getElementById('drawFileSize');
  const drawFileExt = document.getElementById('drawFileExt');
  const drawIndexBadge = document.getElementById('drawIndexBadge');
  const videoCountBadge = document.getElementById('videoCountBadge');

  const btnNextDraw = document.getElementById('btnNextDraw');
  const btnPrevDraw = document.getElementById('btnPrevDraw');
  const btnCopyName = document.getElementById('btnCopyName');
  const btnCopyFullPath = document.getElementById('btnCopyFullPath');

  const btnToggleShuffle = document.getElementById('btnToggleShuffle');
  const shuffleStatusText = document.getElementById('shuffleStatusText');

  // Toast UI
  const toastNotification = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');

  // Drawer UI
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

  // Supported extensions
  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.mkv', '.m4v', '.avi', '.ts', '.3gp', '.flv', '.vob', '.wmv'];

  // Application State
  let videoFiles = [];
  let playedHistory = [];
  let historyPointer = -1;
  let unplayedIndices = [];
  let activeIndex = -1;
  let isShuffleNoRepeat = true;

  // Init
  function init() {
    bindEvents();
  }

  function bindEvents() {
    folderInput.addEventListener('change', handleFolderSelect);

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', handleDrop);

    btnNextDraw.addEventListener('click', () => drawNextVideo(true));
    btnPrevDraw.addEventListener('click', drawPrevVideo);

    btnCopyName.addEventListener('click', copyFileName);
    btnCopyFullPath.addEventListener('click', copyFolderPath);

    btnToggleShuffle.addEventListener('click', toggleShuffleMode);

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
   * File Reading & Processing
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
    pickerStage.classList.remove('hidden');

    renderPlaylist();
    drawNextVideo(true);
  }

  function resetUnplayedIndices() {
    unplayedIndices = Array.from({ length: videoFiles.length }, (_, i) => i);
  }

  /* ----------------------------------------------------
   * Draw Logic & UI Update
   * ---------------------------------------------------- */

  function drawNextVideo(forceNewRandom = false) {
    if (videoFiles.length === 0) return;

    if (!forceNewRandom && historyPointer >= 0 && historyPointer < playedHistory.length - 1) {
      historyPointer++;
      renderDrawCard(playedHistory[historyPointer]);
      return;
    }

    let nextIndex;
    if (isShuffleNoRepeat) {
      if (unplayedIndices.length === 0) {
        resetUnplayedIndices();
        showToast('Todos os vídeos já foram sorteados! Reiniciando ciclo.');
      }
      const randomPos = Math.floor(Math.random() * unplayedIndices.length);
      nextIndex = unplayedIndices.splice(randomPos, 1)[0];
    } else {
      nextIndex = Math.floor(Math.random() * videoFiles.length);
    }

    playedHistory.push(nextIndex);
    historyPointer = playedHistory.length - 1;

    renderDrawCard(nextIndex);
  }

  function drawPrevVideo() {
    if (historyPointer > 0) {
      historyPointer--;
      renderDrawCard(playedHistory[historyPointer]);
      showToast('Vídeo anterior');
    } else {
      showToast('Início do histórico');
    }
  }

  function renderDrawCard(index) {
    if (index < 0 || index >= videoFiles.length) return;

    activeIndex = index;
    const file = videoFiles[index];

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split('/');
    const folderName = pathParts.length > 1 ? pathParts.slice(0, -1).join(' / ') : 'Pasta Principal';

    const ext = file.name.split('.').pop().toUpperCase() || 'VÍDEO';
    const sizeFormatted = formatFileSize(file.size);

    drawFolderPath.textContent = folderName;
    drawFileName.textContent = file.name;
    drawFileSize.textContent = sizeFormatted;
    drawFileExt.textContent = ext;
    drawIndexBadge.textContent = `${index + 1} / ${videoFiles.length}`;

    // Re-trigger CSS animation
    const card = document.querySelector('.draw-card');
    if (card) {
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = 'cardAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }

    highlightPlaylistItem(index);
    showToast(`Sorteado: ${file.name}`);
  }

  /* ----------------------------------------------------
   * Copy Actions
   * ---------------------------------------------------- */

  function copyFileName() {
    const file = videoFiles[activeIndex];
    if (!file) return;

    copyToClipboard(file.name, `Nome copiado: "${file.name}"`);
  }

  function copyFolderPath() {
    const file = videoFiles[activeIndex];
    if (!file) return;

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split('/');
    const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : fullPath;

    copyToClipboard(folderPath, `Caminho copiado: "${folderPath}"`);
  }

  function copyToClipboard(text, successToastMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successToastMsg);
      }).catch(() => fallbackCopy(text, successToastMsg));
    } else {
      fallbackCopy(text, successToastMsg);
    }
  }

  function fallbackCopy(text, successToastMsg) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successToastMsg);
    } catch (err) {
      showToast('Erro ao copiar.');
    }
    document.body.removeChild(textArea);
  }

  function toggleShuffleMode() {
    isShuffleNoRepeat = !isShuffleNoRepeat;
    shuffleStatusText.textContent = isShuffleNoRepeat ? 'Ativado' : 'Desativado';
    btnToggleShuffle.classList.toggle('active', isShuffleNoRepeat);
    showToast(isShuffleNoRepeat ? 'Sem Repetição: Ativado' : 'Sem Repetição: Desativado');
  }

  /* ----------------------------------------------------
   * Drawer & Toast UI
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
        renderDrawCard(index);
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

  let toastTimeout = null;
  function showToast(message) {
    toastText.textContent = message;
    toastNotification.classList.remove('hidden');
    toastNotification.style.animation = 'none';
    void toastNotification.offsetWidth;
    toastNotification.style.animation = 'toastFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 1200);
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
      case 'KeyN':
        e.preventDefault();
        drawNextVideo(true);
        break;

      case 'KeyP':
        e.preventDefault();
        drawPrevVideo();
        break;

      case 'KeyC':
        e.preventDefault();
        copyFileName();
        break;
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  document.addEventListener('DOMContentLoaded', init);
})();
