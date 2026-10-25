/**
 * Manu Finder — Visual Similarity Search Engine
 * Features:
 * 1. High-fidelity dHash (Difference Hash) & aHash (Average Hash) for exact/duplicate detection.
 * 2. Multi-Zone Spatial Color Distribution & Palette Extraction.
 * 3. Structural Gradient & Edge Layout Mapping.
 * 4. Multi-metric composite similarity scoring with confidence rating.
 */

class SearchEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Helper to load an image source (Blob, File, URL, ImageElement) into an HTMLImageElement
   */
  async loadImage(source) {
    if (source instanceof HTMLImageElement && source.complete && source.naturalWidth > 0) {
      return source;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image for feature extraction'));

      if (source instanceof File || source instanceof Blob) {
        img.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        img.src = source;
      } else if (source instanceof HTMLCanvasElement) {
        img.src = source.toDataURL();
      } else {
        reject(new Error('Unsupported image source type'));
      }
    });
  }

  /**
   * Extract complete visual feature fingerprint from an image
   */
  async extractFeatures(source) {
    const img = await this.loadImage(source);

    // Compute dimensions and aspect ratio
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const aspectRatio = width / (height || 1);

    // 1. Calculate Perceptual Hashes (dHash 64-bit and 256-bit)
    const dHash64 = this.computeDHash(img, 9, 8); // 8x8 = 64 bits
    const dHash256 = this.computeDHash(img, 17, 16); // 16x16 = 256 bits

    // 2. Calculate Average Hash (aHash 64-bit)
    const aHash64 = this.computeAHash(img, 8, 8);

    // 3. Extract Multi-Zone Color Distribution
    const colorZones = this.computeColorZones(img);

    // 4. Extract Dominant Color Palette (Top 5 Hex colors)
    const dominantColors = this.extractDominantColors(img);

    // 5. Structural Edge / Gradient Layout Map
    const structuralGrid = this.computeStructuralGrid(img, 16, 16);

    return {
      dimensions: { width, height, aspectRatio: Number(aspectRatio.toFixed(3)) },
      dHash64,
      dHash256,
      aHash64,
      colorZones,
      dominantColors,
      structuralGrid
    };
  }

  /**
   * Difference Hash (dHash)
   * Tracks gradient changes between adjacent pixels.
   * Invariant to scaling, aspect ratio, minor color shifts, compression.
   */
  computeDHash(img, targetWidth, targetHeight) {
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const imgData = this.ctx.getImageData(0, 0, targetWidth, targetHeight).data;
    let hashBits = '';

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth - 1; x++) {
        const idxLeft = (y * targetWidth + x) * 4;
        const idxRight = (y * targetWidth + (x + 1)) * 4;

        // Grayscale luminescence formula (ITU-R BT.601)
        const grayLeft = 0.299 * imgData[idxLeft] + 0.587 * imgData[idxLeft + 1] + 0.114 * imgData[idxLeft + 2];
        const grayRight = 0.299 * imgData[idxRight] + 0.587 * imgData[idxRight + 1] + 0.114 * imgData[idxRight + 2];

        hashBits += grayLeft < grayRight ? '1' : '0';
      }
    }

    return hashBits;
  }

  /**
   * Average Hash (aHash)
   * Compares pixel values to image mean luminescence.
   */
  computeAHash(img, targetWidth, targetHeight) {
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const imgData = this.ctx.getImageData(0, 0, targetWidth, targetHeight).data;
    const totalPixels = targetWidth * targetHeight;
    const grays = new Float32Array(totalPixels);
    let sum = 0;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const g = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      grays[i] = g;
      sum += g;
    }

    const avg = sum / totalPixels;
    let hashBits = '';
    for (let i = 0; i < totalPixels; i++) {
      hashBits += grays[i] >= avg ? '1' : '0';
    }

    return hashBits;
  }

  /**
   * Multi-zone Color Histograms:
   * Divides image into Top-Left, Top-Right, Bottom-Left, Bottom-Right, and Center Zone.
   * Generates color bucket distribution for each zone.
   */
  computeColorZones(img) {
    const size = 32;
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.drawImage(img, 0, 0, size, size);

    const data = this.ctx.getImageData(0, 0, size, size).data;
    const half = size / 2;

    // 5 zones: TL (0), TR (1), BL (2), BR (3), Center (4)
    // 16 color buckets per zone (quantized RGB 2x2x2 or 8 hue bins + brightness)
    const zones = [
      new Float32Array(16),
      new Float32Array(16),
      new Float32Array(16),
      new Float32Array(16),
      new Float32Array(16)
    ];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // 16-bucket quantization: 4 bits based on RGB channels
        const bucket = ((r > 128 ? 1 : 0) << 3) |
                       ((g > 128 ? 1 : 0) << 2) |
                       ((b > 128 ? 1 : 0) << 1) |
                       ((r + g + b > 380 ? 1 : 0));

        // Determine which zone(s) this pixel belongs to
        if (x < half && y < half) zones[0][bucket]++;
        else if (x >= half && y < half) zones[1][bucket]++;
        else if (x < half && y >= half) zones[2][bucket]++;
        else if (x >= half && y >= half) zones[3][bucket]++;

        // Center zone: inner 50%
        if (x >= size / 4 && x < (size * 3) / 4 && y >= size / 4 && y < (size * 3) / 4) {
          zones[4][bucket]++;
        }
      }
    }

    // Normalize each zone vector
    return zones.map((vec) => {
      let sum = 0;
      for (let i = 0; i < vec.length; i++) sum += vec[i];
      if (sum > 0) {
        for (let i = 0; i < vec.length; i++) vec[i] /= sum;
      }
      return Array.from(vec);
    });
  }

  /**
   * Extract top 5 dominant colors and their percentages
   */
  extractDominantColors(img) {
    const size = 32;
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.drawImage(img, 0, 0, size, size);

    const data = this.ctx.getImageData(0, 0, size, size).data;
    const colorCounts = {};

    for (let i = 0; i < data.length; i += 4) {
      // Quantize to 32-step buckets to group near-identical colors
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const totalSamples = size * size;
    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rgbStr, count]) => {
        const [r, g, b] = rgbStr.split(',').map(Number);
        const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        const pct = Math.round((count / totalSamples) * 100);
        return { hex, rgb: [r, g, b], pct };
      });

    return sorted;
  }

  /**
   * Structural Edge / Gradient Map (16x16)
   * Captures layout elements (cards, text columns, hero blocks) by edge gradients
   */
  computeStructuralGrid(img, width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(img, 0, 0, width, height);

    const data = this.ctx.getImageData(0, 0, width, height).data;
    const grid = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const current = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        // Gradient with right neighbor
        let gradX = 0;
        if (x < width - 1) {
          const idxR = (y * width + (x + 1)) * 4;
          const right = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
          gradX = Math.abs(current - right);
        }

        // Gradient with bottom neighbor
        let gradY = 0;
        if (y < height - 1) {
          const idxB = ((y + 1) * width + x) * 4;
          const bottom = 0.299 * data[idxB] + 0.587 * data[idxB + 1] + 0.114 * data[idxB + 2];
          gradY = Math.abs(current - bottom);
        }

        grid[y * width + x] = Math.sqrt(gradX * gradX + gradY * gradY);
      }
    }

    // Normalize
    let max = 1e-5;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > max) max = grid[i];
    }
    for (let i = 0; i < grid.length; i++) {
      grid[i] /= max;
    }

    return Array.from(grid);
  }

  /**
   * Calculate Hamming Distance between two binary hash strings
   */
  hammingDistance(hashA, hashB) {
    if (!hashA || !hashB || hashA.length !== hashB.length) return 999;
    let dist = 0;
    for (let i = 0; i < hashA.length; i++) {
      if (hashA[i] !== hashB[i]) dist++;
    }
    return dist;
  }

  /**
   * Cosine similarity between two float vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Compare two designs' visual features and return detailed similarity score
   */
  compareFeatures(featA, featB) {
    if (!featA || !featB) {
      return { totalScore: 0, matchCategory: 'NONE', breakdown: {} };
    }

    // 1. dHash Distance (256-bit and 64-bit)
    const dist256 = this.hammingDistance(featA.dHash256, featB.dHash256);
    const dHash256Sim = Math.max(0, 1 - (dist256 / (featA.dHash256 ? featA.dHash256.length : 256)));

    const dist64 = this.hammingDistance(featA.dHash64, featB.dHash64);
    const dHash64Sim = Math.max(0, 1 - (dist64 / 64));

    // Combined dHash score
    const dHashScore = (dHash256Sim * 0.7) + (dHash64Sim * 0.3);

    // 2. aHash Distance
    const aDist = this.hammingDistance(featA.aHash64, featB.aHash64);
    const aHashScore = Math.max(0, 1 - (aDist / 64));

    // 3. Color Zone Similarity (average cosine similarity across 5 zones)
    let colorSim = 0;
    if (featA.colorZones && featB.colorZones && featA.colorZones.length === featB.colorZones.length) {
      let zoneSum = 0;
      for (let i = 0; i < featA.colorZones.length; i++) {
        zoneSum += this.cosineSimilarity(featA.colorZones[i], featB.colorZones[i]);
      }
      colorSim = Math.max(0, zoneSum / featA.colorZones.length);
    }

    // 4. Structural Layout Similarity
    let structSim = 0;
    if (featA.structuralGrid && featB.structuralGrid) {
      structSim = Math.max(0, this.cosineSimilarity(featA.structuralGrid, featB.structuralGrid));
    }

    // 5. Compute Weighted Total Score (0 - 100)
    let totalScore = 0;

    // Special exact / near duplicate logic:
    // If 64-bit dHash distance is 0 or 1, and 256-bit distance is <= 4, it is virtually identical
    if (dist64 <= 1 && dist256 <= 5) {
      totalScore = 99.0 + (1 - (dist256 / 256));
    } else if (dist64 <= 4 && dist256 <= 20) {
      // Near duplicate / minor revision
      totalScore = 92.0 + (dHashScore * 6);
    } else {
      // General similarity formula:
      // dHash: 50%, Color: 25%, Structure: 15%, aHash: 10%
      totalScore = (
        (dHashScore * 0.50) +
        (colorSim * 0.25) +
        (structSim * 0.15) +
        (aHashScore * 0.10)
      ) * 100;
    }

    totalScore = Math.min(100, Math.max(0, Number(totalScore.toFixed(1))));

    // Determine category
    let matchCategory = 'LOW';
    let badgeClass = 'badge-low';
    let label = 'Low Relevance';

    if (totalScore >= 98) {
      matchCategory = 'EXACT';
      badgeClass = 'badge-exact';
      label = 'Exact Match / Direct Export';
    } else if (totalScore >= 85) {
      matchCategory = 'HIGH';
      badgeClass = 'badge-high';
      label = 'High Similarity / Revision';
    } else if (totalScore >= 65) {
      matchCategory = 'SIMILAR';
      badgeClass = 'badge-similar';
      label = 'Layout & Style Match';
    } else {
      matchCategory = 'LOW';
      badgeClass = 'badge-low';
      label = 'Weak Visual Correlation';
    }

    return {
      totalScore,
      matchCategory,
      badgeClass,
      label,
      breakdown: {
        dHashScore: Math.round(dHashScore * 100),
        aHashScore: Math.round(aHashScore * 100),
        colorSim: Math.round(colorSim * 100),
        structSim: Math.round(structSim * 100),
        hamming64: dist64,
        hamming256: dist256
      }
    };
  }

  /**
   * Search an entire library against query features
   */
  search(queryFeatures, vaultDesigns, minThreshold = 40) {
    const results = [];

    for (const design of vaultDesigns) {
      if (!design.features) continue;
      const comparison = this.compareFeatures(queryFeatures, design.features);
      if (comparison.totalScore >= minThreshold) {
        results.push({
          design,
          similarity: comparison
        });
      }
    }

    // Sort descending by match score
    results.sort((a, b) => b.similarity.totalScore - a.similarity.totalScore);
    return results;
  }

  /**
   * Generate an optimized thumbnail (max 400x400) for instant loading
   */
  async createThumbnail(source, maxDimension = 360) {
    const img = await this.loadImage(source);
    let { width, height } = img;

    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(img, 0, 0, width, height);

    return this.canvas.toDataURL('image/jpeg', 0.85);
  }
}

// Global instance
window.searchEngine = new SearchEngine();
