/**
 * AirPods Max — Apple-Inspired Minimalist Product Hero
 * Continuous 196-frame scroll animation engine with auto-hiding navbar,
 * edge-aligned typography, and centered product composition.
 */

(function () {
  'use strict';

  // --- Configuration ---
  const FOLDER_CONFIG = [
    { folder: 'Frame_1', count: 73, name: 'Frame_1' },
    { folder: 'Frame_2', fallbackFolder: 'Frame _2', count: 51, name: 'Frame_2' },
    { folder: 'Frame_3', count: 72, name: 'Frame_3' }
  ];

  const TOTAL_FRAMES = FOLDER_CONFIG.reduce((acc, curr) => acc + curr.count, 0); // 196 frames
  const LERP_DAMPING = 0.14; // Ultra-smooth physics interpolation

  const CHAPTER_STOPS = [0, 48, 98, 146, 195]; // Frame milestones for chapters 1 - 5

  // --- DOM Elements ---
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const preloader = document.getElementById('preloader');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressFrames = document.getElementById('progressFrames');
  const navbar = document.getElementById('navbar');
  const chapterBlocks = document.querySelectorAll('.chapter-block');
  const currentStep = document.getElementById('currentStep');
  const btnTogglePlay = document.getElementById('btnTogglePlay');
  const playIcon = document.getElementById('playIcon');
  const playCaption = document.getElementById('playCaption');
  const btnPrevChapter = document.getElementById('btnPrevChapter');
  const btnNextChapter = document.getElementById('btnNextChapter');
  const btnMoreDetails = document.getElementById('btnMoreDetails');
  const btnBuyProduct = document.getElementById('btnBuyProduct');

  // --- Animation State ---
  const frameImages = new Array(TOTAL_FRAMES);
  const frameLoadedStatus = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;
  let isInitialLoadComplete = false;
  let targetFrame = 0;
  let currentFrame = 0;
  let lastDrawnIndex = -1;
  let isAutoPlaying = false;
  let autoPlayRafId = null;

  // --- Navbar Auto-Hide State ---
  let lastScrollY = 0;
  let isNavHidden = false;

  // --- Build Frame Metadata ---
  const frameMetadata = [];
  let cumulativeIndex = 0;

  FOLDER_CONFIG.forEach((config) => {
    for (let i = 1; i <= config.count; i++) {
      const paddedNum = String(i).padStart(3, '0');
      const filename = `ezgif-frame-${paddedNum}.png`;
      const primaryUrl = `Assets/${config.folder}/${filename}`;
      const fallbackUrl = config.fallbackFolder ? `Assets/${config.fallbackFolder}/${filename}` : null;

      frameMetadata.push({
        index: cumulativeIndex,
        sequenceName: config.name,
        localFrameIndex: i,
        primaryUrl: primaryUrl,
        fallbackUrl: fallbackUrl
      });
      cumulativeIndex++;
    }
  });

  // --- Preloading System ---
  function preloadAllFrames() {
    return new Promise((resolve) => {
      frameMetadata.forEach((meta) => {
        const img = new Image();
        let hasRetried = false;

        img.onload = () => {
          frameLoadedStatus[meta.index] = true;
          frameImages[meta.index] = img;
          loadedCount++;

          updatePreloadUI(loadedCount, TOTAL_FRAMES);

          // Render first frame as soon as frame 0 is ready
          if (meta.index === 0 && lastDrawnIndex === -1) {
            renderFrame(0);
          }

          if (loadedCount >= TOTAL_FRAMES) {
            finishPreloading();
            resolve();
          }
        };

        img.onerror = () => {
          if (!hasRetried && meta.fallbackUrl) {
            hasRetried = true;
            img.src = meta.fallbackUrl;
            return;
          }
          console.warn(`Could not load frame ${meta.index}: ${meta.primaryUrl}`);
          frameLoadedStatus[meta.index] = false;
          loadedCount++;
          updatePreloadUI(loadedCount, TOTAL_FRAMES);

          if (loadedCount >= TOTAL_FRAMES) {
            finishPreloading();
            resolve();
          }
        };

        img.src = meta.primaryUrl;
      });
    });
  }

  function updatePreloadUI(loaded, total) {
    const percent = Math.min(100, Math.floor((loaded / total) * 100));
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}%`;
    if (progressFrames) progressFrames.textContent = `Loading ${loaded} / ${total}`;
  }

  function finishPreloading() {
    if (isInitialLoadComplete) return;
    isInitialLoadComplete = true;

    setTimeout(() => {
      if (preloader) preloader.classList.add('fade-out');
      renderFrame(Math.round(currentFrame));
    }, 200);
  }

  // --- Canvas Resizing & Centering ---
  let canvasWidth = 0;
  let canvasHeight = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.floor(canvasWidth * DPR);
    canvas.height = Math.floor(canvasHeight * DPR);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(DPR, DPR);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    lastDrawnIndex = -1;
    renderFrame(Math.round(currentFrame));
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // --- Frame Rendering Core ---
  function renderFrame(index) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
    let img = frameImages[clampedIndex];

    // Neighbor fallback if texture is pending
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = clampedIndex - offset;
        const next = clampedIndex + offset;
        if (prev >= 0 && frameImages[prev] && frameImages[prev].complete && frameImages[prev].naturalWidth > 0) {
          img = frameImages[prev];
          break;
        }
        if (next < TOTAL_FRAMES && frameImages[next] && frameImages[next].complete && frameImages[next].naturalWidth > 0) {
          img = frameImages[next];
          break;
        }
      }
    }

    if (!img) return;

    // Fill off-white studio neutral background
    ctx.fillStyle = '#E4E3DC';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate Cover aspect ratio with centered composition
    const imgWidth = img.naturalWidth || 1280;
    const imgHeight = img.naturalHeight || 720;
    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    lastDrawnIndex = clampedIndex;

    // Synchronize Editorial Chapters & Steps
    updateEditorialOverlay(clampedIndex);
  }

  // --- Editorial Text & Chapters Transition Engine ---
  function updateEditorialOverlay(frameIndex) {
    let activeChapterNumber = 1;

    chapterBlocks.forEach((block, idx) => {
      const start = parseFloat(block.dataset.start);
      const peak = parseFloat(block.dataset.peak);
      const end = parseFloat(block.dataset.end);

      let opacity = 0;
      let translateY = 14;

      if (frameIndex >= start && frameIndex <= end) {
        activeChapterNumber = idx + 1;

        if (frameIndex <= peak) {
          const t = (frameIndex - start) / Math.max(1, peak - start);
          opacity = Math.sin((t * Math.PI) / 2);
          translateY = (1 - t) * 14;
        } else {
          const t = (frameIndex - peak) / Math.max(1, end - peak);
          opacity = Math.cos((t * Math.PI) / 2);
          translateY = -t * 14;
        }

        block.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
        block.style.transform = `translateY(${translateY.toFixed(1)}px)`;
        block.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';
        block.classList.toggle('active', opacity > 0.2);
      } else {
        block.style.opacity = '0';
        block.style.visibility = 'hidden';
        block.classList.remove('active');
      }
    });

    // Update bottom step indicator (01 / 05)
    if (currentStep) {
      currentStep.textContent = String(activeChapterNumber).padStart(2, '0');
    }
  }

  // --- Scroll & Navbar Handling ---
  function getMaxScroll() {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ) - window.innerHeight;
  }

  function getScrollFraction() {
    const maxScroll = getMaxScroll();
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, (window.scrollY || window.pageYOffset || 0) / maxScroll));
  }

  function onScroll() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = getMaxScroll();
    const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
    targetFrame = progress * (TOTAL_FRAMES - 1);

    // Auto-hiding Navbar logic
    const delta = scrollY - lastScrollY;
    if (scrollY > 70 && delta > 3 && !isNavHidden) {
      navbar.classList.add('nav-hidden');
      isNavHidden = true;
    } else if (delta < -3 && isNavHidden) {
      navbar.classList.remove('nav-hidden');
      isNavHidden = false;
    } else if (scrollY <= 30 && isNavHidden) {
      navbar.classList.remove('nav-hidden');
      isNavHidden = false;
    }

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Main 60/120 FPS Interpolation Loop
  function animationLoop() {
    const delta = targetFrame - currentFrame;

    if (Math.abs(delta) > 0.08) {
      currentFrame += delta * LERP_DAMPING;
    } else {
      currentFrame = targetFrame;
    }

    const rounded = Math.round(currentFrame);
    if (rounded !== lastDrawnIndex) {
      renderFrame(rounded);
    }

    requestAnimationFrame(animationLoop);
  }

  // --- Chapter Navigation Buttons ---
  function scrollToFrame(frameIdx) {
    const maxScroll = getMaxScroll();
    const fraction = frameIdx / (TOTAL_FRAMES - 1);
    window.scrollTo({
      top: fraction * maxScroll,
      behavior: 'smooth'
    });
  }

  if (btnPrevChapter) {
    btnPrevChapter.addEventListener('click', () => {
      const rounded = Math.round(targetFrame);
      let target = CHAPTER_STOPS[0];
      for (let i = CHAPTER_STOPS.length - 1; i >= 0; i--) {
        if (CHAPTER_STOPS[i] < rounded - 5) {
          target = CHAPTER_STOPS[i];
          break;
        }
      }
      scrollToFrame(target);
    });
  }

  if (btnNextChapter) {
    btnNextChapter.addEventListener('click', () => {
      const rounded = Math.round(targetFrame);
      let target = CHAPTER_STOPS[CHAPTER_STOPS.length - 1];
      for (let i = 0; i < CHAPTER_STOPS.length; i++) {
        if (CHAPTER_STOPS[i] > rounded + 5) {
          target = CHAPTER_STOPS[i];
          break;
        }
      }
      scrollToFrame(target);
    });
  }

  if (btnMoreDetails) {
    btnMoreDetails.addEventListener('click', () => {
      const rounded = Math.round(targetFrame);
      // Advance to next chapter
      let target = CHAPTER_STOPS[1];
      for (let i = 0; i < CHAPTER_STOPS.length; i++) {
        if (CHAPTER_STOPS[i] > rounded + 5) {
          target = CHAPTER_STOPS[i];
          break;
        }
      }
      scrollToFrame(target);
    });
  }

  if (btnBuyProduct) {
    btnBuyProduct.addEventListener('click', () => {
      scrollToFrame(CHAPTER_STOPS[CHAPTER_STOPS.length - 1]);
    });
  }

  // --- Auto-Play Toggle ---
  function toggleAutoPlay() {
    isAutoPlaying = !isAutoPlaying;

    if (playIcon) playIcon.textContent = isAutoPlaying ? '⏸' : '▶';
    if (playCaption) playCaption.textContent = isAutoPlaying ? 'Pause animation' : 'Play animation';

    if (isAutoPlaying) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
  }

  function startAutoPlay() {
    let lastTime = performance.now();
    const maxScroll = getMaxScroll();

    function playStep(time) {
      if (!isAutoPlaying) return;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      targetFrame += dt * 22; // ~22 fps progression

      if (targetFrame >= TOTAL_FRAMES - 1) {
        targetFrame = TOTAL_FRAMES - 1;
        toggleAutoPlay();
      }

      const fraction = targetFrame / (TOTAL_FRAMES - 1);
      window.scrollTo(0, fraction * maxScroll);

      if (isAutoPlaying) {
        autoPlayRafId = requestAnimationFrame(playStep);
      }
    }

    autoPlayRafId = requestAnimationFrame(playStep);
  }

  function stopAutoPlay() {
    isAutoPlaying = false;
    if (playIcon) playIcon.textContent = '▶';
    if (playCaption) playCaption.textContent = 'Play animation';
    if (autoPlayRafId) cancelAnimationFrame(autoPlayRafId);
  }

  if (btnTogglePlay) {
    btnTogglePlay.addEventListener('click', toggleAutoPlay);
  }

  window.addEventListener('wheel', () => {
    if (isAutoPlaying) stopAutoPlay();
  }, { passive: true });

  window.addEventListener('touchstart', () => {
    if (isAutoPlaying) stopAutoPlay();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      toggleAutoPlay();
    } else if (e.key === 'ArrowRight') {
      scrollToFrame(Math.min(TOTAL_FRAMES - 1, Math.round(targetFrame) + 2));
    } else if (e.key === 'ArrowLeft') {
      scrollToFrame(Math.max(0, Math.round(targetFrame) - 2));
    }
  });

  // --- Initialize ---
  function init() {
    resizeCanvas();
    preloadAllFrames();
    requestAnimationFrame(animationLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
