/**
 * Manu Finder — Interactive Visual Comparison Module
 * Supports:
 * - Split-curtain draggable slider (Before/After)
 * - Pixel Diff / Difference Overlay mode (highlights exact areas client changed)
 * - Side-by-side synchronized zoom & pan view
 */

class ComparisonViewer {
  constructor() {
    this.modal = null;
    this.currentQueryImage = null;
    this.currentMatchedDesign = null;
    this.currentSimilarity = null;
    this.sliderPos = 50; // percentage
    this.isDragging = false;
    this.activeViewMode = 'split'; // 'split', 'diff', 'side-by-side'
  }

  init() {
    this.modal = document.getElementById('comparisonModal');
    this.splitHandle = document.getElementById('splitHandle');
    this.splitDivider = document.getElementById('splitDivider');
    this.splitOverlay = document.getElementById('splitOverlay');
    this.splitContainer = document.getElementById('splitContainer');
    this.queryImgEl = document.getElementById('compQueryImg');
    this.matchImgEl = document.getElementById('compMatchImg');
    this.diffCanvas = document.getElementById('diffCanvas');

    this.bindEvents();
  }

  bindEvents() {
    if (!this.splitHandle || !this.splitContainer) return;

    // Split slider drag handling
    const startDrag = (e) => {
      this.isDragging = true;
      e.preventDefault();
    };

    const stopDrag = () => {
      this.isDragging = false;
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const rect = this.splitContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      let pct = (x / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      this.setSplitPosition(pct);
    };

    this.splitHandle.addEventListener('mousedown', startDrag);
    this.splitHandle.addEventListener('touchstart', startDrag, { passive: false });

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });

    // Click anywhere on container to move slider
    this.splitContainer.addEventListener('click', (e) => {
      if (e.target === this.splitHandle) return;
      const rect = this.splitContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let pct = (x / rect.width) * 100;
      this.setSplitPosition(Math.max(0, Math.min(100, pct)));
    });

    // Close button
    const closeBtn = document.getElementById('closeComparisonBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });

    // View mode switchers (Split vs Diff vs Side-by-Side)
    const modeTabs = document.querySelectorAll('.comp-mode-btn');
    modeTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setMode(mode);
      });
    });
  }

  setSplitPosition(pct) {
    this.sliderPos = pct;
    if (this.splitHandle) this.splitHandle.style.left = `${pct}%`;
    if (this.splitDivider) this.splitDivider.style.left = `${pct}%`;
    if (this.splitOverlay) this.splitOverlay.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  }

  setMode(mode) {
    this.activeViewMode = mode;
    document.querySelectorAll('.comp-mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const splitView = document.getElementById('splitViewWrapper');
    const sideView = document.getElementById('sideBySideWrapper');
    const diffView = document.getElementById('diffViewWrapper');

    if (splitView) splitView.classList.toggle('hidden', mode !== 'split');
    if (sideView) sideView.classList.toggle('hidden', mode !== 'side-by-side');
    if (diffView) diffView.classList.toggle('hidden', mode !== 'diff');

    if (mode === 'diff') {
      this.renderPixelDiff();
    }
  }

  async open(queryImageSrc, matchedDesign, similarity) {
    this.currentQueryImage = queryImageSrc;
    this.currentMatchedDesign = matchedDesign;
    this.currentSimilarity = similarity;

    // Set images for split view
    if (this.queryImgEl) this.queryImgEl.src = queryImageSrc;
    if (this.matchImgEl) {
      // Use full blob URL if available, else thumbnail
      if (matchedDesign.imageBlob) {
        this.matchImgEl.src = URL.createObjectURL(matchedDesign.imageBlob);
      } else {
        this.matchImgEl.src = matchedDesign.thumbnail;
      }
    }

    // Set images for side-by-side view
    const sideQuery = document.getElementById('sideQueryImg');
    const sideMatch = document.getElementById('sideMatchImg');
    if (sideQuery) sideQuery.src = queryImageSrc;
    if (sideMatch) sideMatch.src = this.matchImgEl.src;

    // Reset split position to center
    this.setSplitPosition(50);
    this.setMode('split');

    // Populate comparison metadata
    this.populateMetadata(matchedDesign, similarity);

    // Show modal
    if (this.modal) {
      this.modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  populateMetadata(design, similarity) {
    const titleEl = document.getElementById('compTitle');
    const clientEl = document.getElementById('compClient');
    const scoreEl = document.getElementById('compScore');
    const badgeEl = document.getElementById('compBadge');
    const tagsEl = document.getElementById('compTags');
    const notesEl = document.getElementById('compNotes');
    const breakdownEl = document.getElementById('compBreakdown');

    if (titleEl) titleEl.textContent = design.title || 'Untitled Design';
    if (clientEl) clientEl.textContent = design.client || 'Unknown Client';

    if (scoreEl && similarity) {
      scoreEl.textContent = `${similarity.totalScore}%`;
    }

    if (badgeEl && similarity) {
      badgeEl.textContent = similarity.label;
      badgeEl.className = `comp-badge ${similarity.badgeClass}`;
    }

    if (tagsEl) {
      tagsEl.innerHTML = '';
      if (Array.isArray(design.tags) && design.tags.length > 0) {
        design.tags.forEach((tag) => {
          const span = document.createElement('span');
          span.className = 'tag-chip';
          span.textContent = `#${tag}`;
          tagsEl.appendChild(span);
        });
      } else {
        tagsEl.innerHTML = '<span class="text-muted text-xs">No tags</span>';
      }
    }

    if (notesEl) {
      notesEl.textContent = design.notes || 'No project notes recorded.';
    }

    if (breakdownEl && similarity && similarity.breakdown) {
      const b = similarity.breakdown;
      breakdownEl.innerHTML = `
        <div class="metric-row">
          <span>Structural / Layout Match</span>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${b.structSim}%"></div></div>
          <span class="metric-val">${b.structSim}%</span>
        </div>
        <div class="metric-row">
          <span>Color & Palette Alignment</span>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${b.colorSim}%"></div></div>
          <span class="metric-val">${b.colorSim}%</span>
        </div>
        <div class="metric-row">
          <span>Perceptual Gradient (dHash)</span>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${b.dHashScore}%"></div></div>
          <span class="metric-val">${b.dHashScore}%</span>
        </div>
        <div class="metric-row text-xs text-muted">
          <span>Hamming Bit Distance: ${b.hamming256} / 256</span>
          <span>(Lower is closer)</span>
        </div>
      `;
    }
  }

  /**
   * Render difference heatmap: highlights modified regions
   */
  async renderPixelDiff() {
    if (!this.diffCanvas || !this.currentQueryImage || !this.matchImgEl) return;

    const canvas = this.diffCanvas;
    const ctx = canvas.getContext('2d');

    const [imgA, imgB] = await Promise.all([
      window.searchEngine.loadImage(this.currentQueryImage),
      window.searchEngine.loadImage(this.matchImgEl.src)
    ]);

    const targetW = 600;
    const targetH = Math.round(targetW / (imgA.naturalWidth / imgA.naturalHeight || 1));

    canvas.width = targetW;
    canvas.height = targetH;

    // Draw imgA to offscreen canvas
    const offCanvasA = document.createElement('canvas');
    offCanvasA.width = targetW;
    offCanvasA.height = targetH;
    const ctxA = offCanvasA.getContext('2d');
    ctxA.drawImage(imgA, 0, 0, targetW, targetH);
    const dataA = ctxA.getImageData(0, 0, targetW, targetH).data;

    // Draw imgB to offscreen canvas
    const offCanvasB = document.createElement('canvas');
    offCanvasB.width = targetW;
    offCanvasB.height = targetH;
    const ctxB = offCanvasB.getContext('2d');
    ctxB.drawImage(imgB, 0, 0, targetW, targetH);
    const dataB = ctxB.getImageData(0, 0, targetW, targetH).data;

    // Calculate diff image
    const diffImgData = ctx.createImageData(targetW, targetH);
    const out = diffImgData.data;

    for (let i = 0; i < dataA.length; i += 4) {
      const dr = Math.abs(dataA[i] - dataB[i]);
      const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
      const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
      const delta = (dr + dg + db) / 3;

      if (delta > 25) {
        // Highlight altered areas in bright neon magenta/red
        out[i] = 255;
        out[i + 1] = Math.max(0, 100 - delta);
        out[i + 2] = 160;
        out[i + 3] = 230;
      } else {
        // Desaturate matched areas into dim grayscale background
        const gray = 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
        out[i] = gray * 0.4;
        out[i + 1] = gray * 0.4;
        out[i + 2] = gray * 0.4;
        out[i + 3] = 180;
      }
    }

    ctx.putImageData(diffImgData, 0, 0);
  }
}

// Global instance
window.comparisonViewer = new ComparisonViewer();
