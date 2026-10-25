/**
 * Manu Finder — IndexedDB Database Manager
 * Stores local designs, high-res blobs, optimized thumbnails, and pre-computed visual features.
 */

const DB_NAME = 'ManuFinderDB';
const DB_VERSION = 1;
const STORE_NAME = 'designs';

class ManuDB {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('client', 'client', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async addDesign(design) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id: design.id || 'des_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: design.title || 'Untitled Design',
        client: design.client || 'Unknown Client',
        tags: Array.isArray(design.tags) ? design.tags : [],
        notes: design.notes || '',
        fileName: design.fileName || 'design.png',
        fileSize: design.fileSize || 0,
        fileType: design.fileType || 'image/png',
        dimensions: design.dimensions || { width: 0, height: 0 },
        thumbnail: design.thumbnail, // base64 or blob URL
        imageBlob: design.imageBlob, // original high-res blob
        features: design.features || null,
        createdAt: design.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async addDesignsBulk(designs, onProgress) {
    const db = await this.init();
    const results = [];
    const total = designs.length;

    for (let i = 0; i < total; i++) {
      const saved = await this.addDesign(designs[i]);
      results.push(saved);
      if (typeof onProgress === 'function') {
        onProgress(i + 1, total, saved);
      }
    }
    return results;
  }

  async getAllDesigns() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort descending by creation date
        const list = request.result || [];
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(list);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getDesignById(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async updateDesign(id, updates) {
    const db = await this.init();
    const existing = await this.getDesignById(id);
    if (!existing) throw new Error('Design not found: ' + id);

    const merged = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(merged);

      request.onsuccess = () => resolve(merged);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteDesign(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async clearAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getStats() {
    const items = await this.getAllDesigns();
    let totalBytes = 0;
    const clients = new Set();
    const allTags = new Set();

    items.forEach((item) => {
      totalBytes += item.fileSize || (item.imageBlob ? item.imageBlob.size : 0);
      if (item.client) clients.add(item.client.trim());
      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => allTags.add(t.trim()));
      }
    });

    return {
      count: items.length,
      totalBytes,
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      uniqueClients: Array.from(clients).filter(Boolean),
      uniqueTags: Array.from(allTags).filter(Boolean)
    };
  }

  async exportBackup() {
    const items = await this.getAllDesigns();
    // Convert blobs to base64 for portable JSON export
    const exportedItems = await Promise.all(
      items.map(async (item) => {
        let base64Image = item.thumbnail;
        if (item.imageBlob) {
          base64Image = await blobToBase64(item.imageBlob);
        }
        return {
          id: item.id,
          title: item.title,
          client: item.client,
          tags: item.tags,
          notes: item.notes,
          fileName: item.fileName,
          fileSize: item.fileSize,
          dimensions: item.dimensions,
          thumbnail: item.thumbnail,
          features: item.features,
          createdAt: item.createdAt,
          imageBase64: base64Image
        };
      })
    );

    return {
      version: 1,
      appName: 'Manu Finder',
      exportedAt: new Date().toISOString(),
      itemCount: exportedItems.length,
      designs: exportedItems
    };
  }
}

// Utility helper to convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Global instance
window.manuDB = new ManuDB();
