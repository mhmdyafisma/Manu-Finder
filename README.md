# Manu Finder — Visual Similarity Search for Designers 🔍

**Manu Finder** is an offline-first visual matching engine and catalog vault designed specifically for graphic designers, UI/UX artists, and design studios.

When a client sends an image (e.g., a WhatsApp screenshot, revised layout, or low-res reference) asking for updates or source files, drop it into **Manu Finder** to instantly match and retrieve your original high-resolution design and project metadata.

---

## 🚀 Quick Start

### 1. Launch the App
* **Option A**: Double-click [`start.bat`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/start.bat).
* **Option B**: Run with PowerShell:
  ```powershell
  cd "C:\Users\usr\.gemini\antigravity\scratch\manu-finder"
  powershell -ExecutionPolicy Bypass -File server.ps1
  ```
* **Option C**: Directly open [`index.html`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/index.html) in your web browser (Brave, Chrome, Opera GX, Edge).

---

## 🎨 Key Features

1. **Multi-Tier Visual Matching**:
   * **pHash & dHash (Perceptual Hashing)**: Matches identical and near-duplicate images even after compression, resizing, format changes, and watermarks.
   * **Multi-Zone Spatial Color Distribution**: Divides images into 5 quadrants to match color schemes and brand palettes.
   * **Structural Edge Maps**: Identifies matching layouts (hero headers, card grids, typography blocks) regardless of minor color changes.
2. **Interactive Visual Inspector**:
   * **Split Curtain Slider (⇄)**: Drag the slider across to compare client references with your original file.
   * **Pixel Diff Heatmap (🔥)**: Neon-highlights modified text, buttons, and crops while desaturating unchanged areas.
   * **Side-by-Side Synchronized View (◫)**: For high-resolution inspection.
3. **Design Vault (Catalog)**:
   * Organize past work by Client Name, Tags (`#UI`, `#Logo`, `#Print`), Date, and Notes.
   * Search and filter with live sorting.
4. **100% Local & Privacy-First**:
   * Powered by browser IndexedDB. All client assets stay strictly on your local computer.
5. **Instant Demo Suite**:
   * One-click "Load 4 Sample Mockups" to immediately test features.
   * "Simulate Client Revision Match" to see an automated 95%+ match test in action.

---

## 📂 Project Structure

* [`index.html`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/index.html) — Main application UI
* [`css/styles.css`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/css/styles.css) — Designer dark theme with glassmorphism and animations
* [`js/db.js`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/js/db.js) — Local IndexedDB persistence manager
* [`js/search-engine.js`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/js/search-engine.js) — Perceptual hash and multi-metric similarity algorithms
* [`js/comparison.js`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/js/comparison.js) — Split-curtain slider and pixel diff heatmap viewer
* [`js/sample-data.js`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/js/sample-data.js) — Programmatic sample artwork generator
* [`js/app.js`](file:///C:/Users/usr/.gemini/antigravity/scratch/manu-finder/js/app.js) — Main application controller
