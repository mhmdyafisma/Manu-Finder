/**
 * Manu Finder — Application Controller
 * Manages navigation, clipboard paste, search workflow, vault gallery, and bulk ingest.
 */

class ManuApp {
  constructor() {
    this.currentQueryImage = null;
    this.currentQueryFeatures = null;
    this.allVaultDesigns = [];
    this.searchResults = [];
    this.minScoreThreshold = 40;
    this.activeTab = 'find';
  }

  async init() {
    // Initialize DB
    await window.manuDB.init();

    // Initialize Comparison Viewer
    window.comparisonViewer.init();

    // Load initial vault data & stats
    await this.refreshVault();

    // Setup Event Listeners
    this.setupNavigation();
    this.setupFindEvents();
    this.setupVaultEvents();
    this.setupUploadEvents();
    this.setupGlobalShortcuts();
    this.setupSamplePackEvents();

    // If vault is empty, suggest loading samples
    if (this.allVaultDesigns.length === 0) {
      this.showToast('Welcome to Manu Finder! Load sample designs to test, or upload your own work.', 'info', 6000);
    }
  }

  /**
   * Navigation Tabs
   */
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab) {
    this.activeTab = tab;

    // Update nav styles
    document.querySelectorAll('.nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    // Toggle tab panels
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tab}`);
    });

    if (tab === 'vault') {
      this.renderVaultGallery();
    }
  }

  /**
   * Refresh DB cache and update UI stats counters
   */
  async refreshVault() {
    this.allVaultDesigns = await window.manuDB.getAllDesigns();
    const stats = await window.manuDB.getStats();

    // Update header stats
    const countEl = document.getElementById('statCount');
    const storageEl = document.getElementById('statStorage');
    const emptyBanner = document.getElementById('vaultEmptyState');

    if (countEl) countEl.textContent = `${stats.count} Designs`;
    if (storageEl) storageEl.textContent = `${stats.totalMB} MB`;

    if (emptyBanner) {
      emptyBanner.classList.toggle('hidden', stats.count > 0);
    }

    // Populate tag filter pills in vault
    this.populateTagFilters(stats.uniqueTags);
  }

  /**
   * Global Keyboard & Clipboard Paste Listener (Ctrl+V)
   */
  setupGlobalShortcuts() {
    window.addEventListener('paste', async (e) => {
      const items = e.clipboardData ? e.clipboardData.items : [];
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          this.switchTab('find');
          this.handleQueryImage(blob, 'Pasted Clipboard Image');
          this.showToast('Analyzing pasted image from clipboard...', 'info');
          break;
        }
      }
    });
  }

  /**
   * FIND MATCH Section Handlers
   */
  setupFindEvents() {
    const dropzone = document.getElementById('searchDropzone');
    const fileInput = document.getElementById('searchFileInput');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleQueryImage(e.dataTransfer.files[0], e.dataTransfer.files[0].name);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleQueryImage(e.target.files[0], e.target.files[0].name);
        }
      });
    }

    if (thresholdSlider && thresholdValue) {
      thresholdSlider.addEventListener('input', (e) => {
        this.minScoreThreshold = Number(e.target.value);
        thresholdValue.textContent = `${this.minScoreThreshold}%`;
        if (this.currentQueryFeatures) {
          this.executeSearch();
        }
      });
    }

    // Clear search button
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSearch());
    }
  }

  /**
   * Handle an uploaded/dropped query image
   */
  async handleQueryImage(source, name = 'Reference Image') {
    const loader = document.getElementById('searchLoading');
    const previewContainer = document.getElementById('queryPreviewContainer');
    const dropzone = document.getElementById('searchDropzone');
    const queryImg = document.getElementById('queryImgPreview');
    const queryName = document.getElementById('queryFileName');
    const queryMeta = document.getElementById('queryMetaDetails');
    const queryColors = document.getElementById('queryDominantColors');

    if (loader) loader.classList.remove('hidden');

    try {
      // 1. Load image and extract features
      const features = await window.searchEngine.extractFeatures(source);
      this.currentQueryFeatures = features;

      // 2. Read as data URL for preview display
      let displayUrl = '';
      if (source instanceof Blob || source instanceof File) {
        displayUrl = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        displayUrl = source;
      } else if (source instanceof HTMLCanvasElement) {
        displayUrl = source.toDataURL();
      }
      this.currentQueryImage = displayUrl;

      // 3. Render Query Metadata Card
      if (dropzone) dropzone.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (queryImg) queryImg.src = displayUrl;
      if (queryName) queryName.textContent = name;
      if (queryMeta) {
        queryMeta.textContent = `${features.dimensions.width} × ${features.dimensions.height}px • Ratio: ${features.dimensions.aspectRatio}`;
      }

      // Dominant color swatches
      if (queryColors && features.dominantColors) {
        queryColors.innerHTML = '';
        features.dominantColors.forEach((c) => {
          const swatch = document.createElement('div');
          swatch.className = 'color-swatch';
          swatch.style.backgroundColor = c.hex;
          swatch.title = `${c.hex} (${c.pct}%)`;
          queryColors.appendChild(swatch);
        });
      }

      // 4. Run Search against vault
      await this.executeSearch();
    } catch (err) {
      console.error('Search error:', err);
      this.showToast('Failed to process image: ' + err.message, 'error');
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  }

  /**
   * Execute similarity search on all designs in vault
   */
  async executeSearch() {
    if (!this.currentQueryFeatures) return;

    if (this.allVaultDesigns.length === 0) {
      this.renderNoVaultResults();
      return;
    }

    const startTime = performance.now();
    const results = window.searchEngine.search(
      this.currentQueryFeatures,
      this.allVaultDesigns,
      this.minScoreThreshold
    );
    const durationMs = Math.round(performance.now() - startTime);

    this.searchResults = results;
    this.renderSearchResults(results, durationMs);
  }

  /**
   * Render ranked visual search results
   */
  renderSearchResults(results, durationMs = 0) {
    const container = document.getElementById('searchResultsList');
    const headerEl = document.getElementById('resultsHeader');
    const countEl = document.getElementById('resultsCount');

    if (!container) return;
    container.innerHTML = '';

    if (headerEl) headerEl.classList.remove('hidden');
    if (countEl) {
      countEl.textContent = `Found ${results.length} match${results.length === 1 ? '' : 'es'} in ${durationMs}ms`;
    }

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-results-box">
          <div class="empty-icon">🔎</div>
          <h3>No designs matched your threshold (${this.minScoreThreshold}%)</h3>
          <p>Try lowering the minimum similarity threshold slider above, or add more designs to your vault.</p>
        </div>
      `;
      return;
    }

    results.forEach(({ design, similarity }, index) => {
      const card = document.createElement('div');
      card.className = `result-card ${index === 0 && similarity.totalScore >= 95 ? 'top-match' : ''}`;

      const tagsHtml = (design.tags || [])
        .map((t) => `<span class="tag-pill">#${t}</span>`)
        .join(' ');

      card.innerHTML = `
        <div class="result-thumb-wrapper">
          <img src="${design.thumbnail || design.imageBlob}" alt="${design.title}" class="result-thumb" loading="lazy">
          <div class="score-badge ${similarity.badgeClass}">
            ${similarity.totalScore}% Match
          </div>
        </div>
        <div class="result-content">
          <div class="result-top-meta">
            <span class="match-category-label">${similarity.label}</span>
            <span class="result-date">${new Date(design.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 class="result-title">${design.title}</h4>
          <p class="result-client"><span class="label-tiny">Client:</span> ${design.client || 'Unknown'}</p>
          <div class="result-tags">${tagsHtml}</div>
          <div class="result-metrics-mini">
            <span>Structure: <b>${similarity.breakdown.structSim}%</b></span>
            <span>Palette: <b>${similarity.breakdown.colorSim}%</b></span>
            <span>Perceptual: <b>${similarity.breakdown.dHashScore}%</b></span>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary btn-compare" data-id="${design.id}">
              <span class="btn-icon">⚡</span> Compare Side-by-Side
            </button>
            <button class="btn btn-ghost btn-details" data-id="${design.id}">
              Details
            </button>
          </div>
        </div>
      `;

      // Compare button click
      const compareBtn = card.querySelector('.btn-compare');
      compareBtn.addEventListener('click', () => {
        window.comparisonViewer.open(this.currentQueryImage, design, similarity);
      });

      // Details button click
      const detailsBtn = card.querySelector('.btn-details');
      detailsBtn.addEventListener('click', () => {
        this.openDesignDetailModal(design);
      });

      container.appendChild(card);
    });
  }

  renderNoVaultResults() {
    const container = document.getElementById('searchResultsList');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-results-box">
        <div class="empty-icon">📂</div>
        <h3>Your Design Vault is currently empty!</h3>
        <p>You need to upload designs or load sample data before searching.</p>
        <button class="btn btn-primary mt-4" id="emptyLoadSampleBtn">Load Sample Designs</button>
      </div>
    `;
    const btn = document.getElementById('emptyLoadSampleBtn');
    if (btn) {
      btn.addEventListener('click', () => this.loadSamplePack());
    }
  }

  clearSearch() {
    this.currentQueryImage = null;
    this.currentQueryFeatures = null;
    this.searchResults = [];

    const dropzone = document.getElementById('searchDropzone');
    const previewContainer = document.getElementById('queryPreviewContainer');
    const resultsContainer = document.getElementById('searchResultsList');
    const headerEl = document.getElementById('resultsHeader');
    const fileInput = document.getElementById('searchFileInput');

    if (dropzone) dropzone.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (headerEl) headerEl.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }

  /**
   * DESIGN VAULT Section Handlers & Gallery
   */
  setupVaultEvents() {
    const searchInput = document.getElementById('vaultSearchInput');
    const sortSelect = document.getElementById('vaultSortSelect');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderVaultGallery());
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.renderVaultGallery());
    }

    // Close detail modal
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener('click', () => this.closeDesignDetailModal());
    }
  }

  populateTagFilters(tags) {
    const tagBar = document.getElementById('vaultTagFilters');
    if (!tagBar) return;

    tagBar.innerHTML = `<button class="filter-chip active" data-tag="ALL">All Designs</button>`;
    tags.forEach((tag) => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.tag = tag;
      chip.textContent = `#${tag}`;
      tagBar.appendChild(chip);
    });

    tagBar.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        tagBar.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderVaultGallery();
      });
    });
  }

  renderVaultGallery() {
    const grid = document.getElementById('vaultGrid');
    const searchInput = document.getElementById('vaultSearchInput');
    const sortSelect = document.getElementById('vaultSortSelect');
    const activeChip = document.querySelector('#vaultTagFilters .filter-chip.active');

    if (!grid) return;
    grid.innerHTML = '';

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedTag = activeChip ? activeChip.dataset.tag : 'ALL';
    const sortVal = sortSelect ? sortSelect.value : 'newest';

    let filtered = [...this.allVaultDesigns];

    // Filter by search text
    if (query) {
      filtered = filtered.filter((d) => {
        const titleMatch = d.title && d.title.toLowerCase().includes(query);
        const clientMatch = d.client && d.client.toLowerCase().includes(query);
        const tagMatch = Array.isArray(d.tags) && d.tags.some((t) => t.toLowerCase().includes(query));
        return titleMatch || clientMatch || tagMatch;
      });
    }

    // Filter by tag
    if (selectedTag && selectedTag !== 'ALL') {
      filtered = filtered.filter((d) => Array.isArray(d.tags) && d.tags.includes(selectedTag));
    }

    // Sort
    if (sortVal === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortVal === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortVal === 'client') {
      filtered.sort((a, b) => (a.client || '').localeCompare(b.client || ''));
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-gallery-msg">
          <p>No designs match your filters.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((design) => {
      const card = document.createElement('div');
      card.className = 'vault-card';

      const tagsHtml = (design.tags || [])
        .slice(0, 3)
        .map((t) => `<span class="tag-pill">#${t}</span>`)
        .join(' ');

      card.innerHTML = `
        <div class="vault-thumb-box">
          <img src="${design.thumbnail || design.imageBlob}" alt="${design.title}" loading="lazy">
          <div class="vault-hover-overlay">
            <span>View Details 🔍</span>
          </div>
        </div>
        <div class="vault-card-body">
          <h4 class="vault-card-title">${design.title}</h4>
          <p class="vault-card-client">${design.client || 'Unknown Client'}</p>
          <div class="vault-card-tags">${tagsHtml}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.openDesignDetailModal(design);
      });

      grid.appendChild(card);
    });
  }

  openDesignDetailModal(design) {
    const modal = document.getElementById('designDetailModal');
    if (!modal) return;

    document.getElementById('modalDetailTitle').textContent = design.title;
    document.getElementById('modalDetailClient').textContent = design.client || 'Unknown';
    document.getElementById('modalDetailDate').textContent = new Date(design.createdAt).toLocaleDateString();
    document.getElementById('modalDetailNotes').textContent = design.notes || 'No project notes.';
    document.getElementById('modalDetailDims').textContent = `${design.dimensions.width} × ${design.dimensions.height}px`;

    const imgEl = document.getElementById('modalDetailImg');
    if (imgEl) {
      if (design.imageBlob) {
        imgEl.src = URL.createObjectURL(design.imageBlob);
      } else {
        imgEl.src = design.thumbnail;
      }
    }

    const tagsEl = document.getElementById('modalDetailTags');
    if (tagsEl) {
      tagsEl.innerHTML = '';
      (design.tags || []).forEach((t) => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = `#${t}`;
        tagsEl.appendChild(span);
      });
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteDesignBtn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete "${design.title}"?`)) {
          await window.manuDB.deleteDesign(design.id);
          this.closeDesignDetailModal();
          await this.refreshVault();
          this.renderVaultGallery();
          this.showToast('Design deleted from library', 'info');
        }
      };
    }

    // Download button
    const downloadBtn = document.getElementById('downloadDesignBtn');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = imgEl.src;
        a.download = design.fileName || `${design.title.replace(/\s+/g, '_')}.png`;
        a.click();
      };
    }

    modal.classList.remove('hidden');
  }

  closeDesignDetailModal() {
    const modal = document.getElementById('designDetailModal');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * ADD DESIGNS (Ingest / Upload)
   */
  setupUploadEvents() {
    const uploadDropzone = document.getElementById('uploadDropzone');
    const uploadInput = document.getElementById('uploadFileInput');
    const saveAllBtn = document.getElementById('saveUploadsBtn');

    if (uploadDropzone && uploadInput) {
      uploadDropzone.addEventListener('click', () => uploadInput.click());

      uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('drag-over');
      });

      uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('drag-over');
      });

      uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files) {
          this.handleStagedFiles(Array.from(e.dataTransfer.files));
        }
      });

      uploadInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handleStagedFiles(Array.from(e.target.files));
        }
      });
    }

    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => this.saveStagedUploads());
    }
  }

  handleStagedFiles(files) {
    this.stagedUploads = this.stagedUploads || [];
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      this.showToast('Please select valid image files (PNG, JPG, WEBP, SVG)', 'error');
      return;
    }

    imageFiles.forEach((file) => {
      this.stagedUploads.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        client: '',
        tags: '',
        notes: ''
      });
    });

    this.renderStagedUploads();
  }

  renderStagedUploads() {
    const container = document.getElementById('stagedList');
    const countBadge = document.getElementById('stagedCountBadge');
    const saveBtn = document.getElementById('saveUploadsBtn');

    if (!container) return;
    container.innerHTML = '';

    const list = this.stagedUploads || [];
    if (countBadge) countBadge.textContent = `${list.length} selected`;
    if (saveBtn) saveBtn.disabled = list.length === 0;

    list.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'staged-item-card';

      const previewUrl = URL.createObjectURL(item.file);

      row.innerHTML = `
        <div class="staged-thumb-box">
          <img src="${previewUrl}" alt="preview">
        </div>
        <div class="staged-fields">
          <input type="text" class="input-text staged-title" placeholder="Project Title" value="${item.title}">
          <input type="text" class="input-text staged-client" placeholder="Client Name (e.g. Acme Studio)" value="${item.client}">
          <input type="text" class="input-text staged-tags" placeholder="Tags (comma separated: UI, Logo, Banner)" value="${item.tags}">
        </div>
        <button class="btn-icon-danger remove-staged-btn" title="Remove">&times;</button>
      `;

      // Update item model on change
      row.querySelector('.staged-title').addEventListener('input', (e) => (item.title = e.target.value));
      row.querySelector('.staged-client').addEventListener('input', (e) => (item.client = e.target.value));
      row.querySelector('.staged-tags').addEventListener('input', (e) => (item.tags = e.target.value));

      row.querySelector('.remove-staged-btn').addEventListener('click', () => {
        this.stagedUploads.splice(idx, 1);
        this.renderStagedUploads();
      });

      container.appendChild(row);
    });
  }

  async saveStagedUploads() {
    const list = this.stagedUploads || [];
    if (list.length === 0) return;

    const progressBox = document.getElementById('uploadProgressBox');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');

    if (progressBox) progressBox.classList.remove('hidden');

    const total = list.length;
    for (let i = 0; i < total; i++) {
      const item = list[i];
      if (progressText) progressText.textContent = `Processing ${i + 1} of ${total}: ${item.title}...`;
      if (progressBar) progressBar.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

      try {
        const features = await window.searchEngine.extractFeatures(item.file);
        const thumbnail = await window.searchEngine.createThumbnail(item.file, 360);
        const tags = item.tags
          ? item.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [];

        await window.manuDB.addDesign({
          title: item.title,
          client: item.client || 'Unknown Client',
          tags,
          notes: item.notes,
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type,
          dimensions: features.dimensions,
          thumbnail,
          imageBlob: item.file,
          features
        });
      } catch (err) {
        console.error('Failed to save design:', err);
      }
    }

    if (progressBox) progressBox.classList.add('hidden');
    this.stagedUploads = [];
    this.renderStagedUploads();
    await this.refreshVault();

    this.showToast(`Successfully added ${total} design${total === 1 ? '' : 's'} to your vault!`, 'success');
    this.switchTab('vault');
  }

  /**
   * Sample Pack & Demo Actions
   */
  setupSamplePackEvents() {
    const loadSampleBtn = document.getElementById('loadSamplePackBtn');
    const testRevisionBtn = document.getElementById('testRevisionBtn');
    const exportBackupBtn = document.getElementById('exportBackupBtn');
    const clearVaultBtn = document.getElementById('clearVaultBtn');

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => this.loadSamplePack());
    }

    if (testRevisionBtn) {
      testRevisionBtn.addEventListener('click', () => this.testClientRevisionDemo());
    }

    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', async () => {
        const data = await window.manuDB.exportBackup();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `manu-finder-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        this.showToast('Backup exported successfully!', 'success');
      });
    }

    if (clearVaultBtn) {
      clearVaultBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete ALL designs in your local vault? This cannot be undone.')) {
          await window.manuDB.clearAll();
          await this.refreshVault();
          this.renderVaultGallery();
          this.showToast('Library cleared.', 'info');
        }
      });
    }
  }

  async loadSamplePack() {
    this.showToast('Generating sample designs with high-res Canvas art...', 'info', 4000);
    const progressEl = document.getElementById('sampleLoadProgress');
    if (progressEl) progressEl.classList.remove('hidden');

    try {
      await window.sampleGenerator.populateSampleVault((current, total, name) => {
        if (progressEl) progressEl.textContent = `Indexing design ${current}/${total}: ${name}...`;
      });

      await this.refreshVault();
      this.showToast('Sample Design Pack loaded successfully! 🎨', 'success');
      this.switchTab('vault');
    } catch (err) {
      this.showToast('Error generating samples: ' + err.message, 'error');
    } finally {
      if (progressEl) progressEl.classList.add('hidden');
    }
  }

  /**
   * Automated Demo: Generates a revised version of NeoFin (simulating a client sending a WhatsApp tweak)
   * and immediately runs the search engine to display a 96%+ match!
   */
  async testClientRevisionDemo() {
    this.showToast('Simulating: Client sent a revised WhatsApp mockup...', 'info', 3000);

    // Ensure sample vault exists first
    if (this.allVaultDesigns.length === 0) {
      await window.sampleGenerator.populateSampleVault();
      await this.refreshVault();
    }

    // Generate client revision
    const rev = await window.sampleGenerator.generateNeoFin('client_revision');

    // Switch to search tab & execute search
    this.switchTab('find');
    await this.handleQueryImage(rev.blob, 'Client_Reference_WhatsApp_Mockup.png');
    this.showToast('Match found! Click "Compare Side-by-Side" to view differences.', 'success', 5000);
  }

  /**
   * Floating Toast Notifications
   */
  showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ManuApp();
  window.app.init();
});
