/**
 * Manu Finder — Sample Design Pack Generator
 * Programmatically generates designer-grade mockups for instant demo testing.
 */

class SampleDataGenerator {
  /**
   * Helper to create an offscreen canvas and return blob & dataURL
   */
  async createDesignCanvas(drawFn, width = 800, height = 600) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    return { canvas, dataUrl, blob, width, height };
  }

  /**
   * Design 1: NeoFin Mobile & Web Hero (Fintech)
   */
  async generateNeoFin(variant = 'original') {
    return this.createDesignCanvas((ctx, w, h) => {
      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0a0d1a');
      bg.addColorStop(0.5, '#12182e');
      bg.addColorStop(1, '#080a14');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Neon purple glow orb
      const orb1 = ctx.createRadialGradient(w * 0.75, h * 0.3, 10, w * 0.75, h * 0.3, 280);
      orb1.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
      orb1.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = orb1;
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.3, 280, 0, Math.PI * 2);
      ctx.fill();

      // Cyan accent orb
      const orb2 = ctx.createRadialGradient(w * 0.2, h * 0.7, 10, w * 0.2, h * 0.7, 240);
      orb2.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      orb2.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = orb2;
      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.7, 240, 0, Math.PI * 2);
      ctx.fill();

      // Top Navigation bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText('⚡ NEOFIN', 60, 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('Products    Solutions    Pricing    Company', 400, 58);

      // Hero Headline
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Inter, sans-serif';
      const headline = variant === 'client_revision' ? 'Smart Investing 2.0' : 'Next-Gen Wealth OS';
      ctx.fillText(headline, 60, 180);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('Automate portfolio rebalancing with deep liquidity pools.', 60, 220);

      // Call to action button
      ctx.fillStyle = variant === 'client_revision' ? '#eab308' : '#06b6d4'; // client changed button to yellow!
      ctx.beginPath();
      ctx.roundRect(60, 260, 180, 48, 12);
      ctx.fill();

      ctx.fillStyle = variant === 'client_revision' ? '#000000' : '#ffffff';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillText('Open Account →', 85, 290);

      // Card mockup on right side
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(460, 140, 280, 380, 20);
      ctx.fill();
      ctx.stroke();

      // Virtual Visa Card inside
      const cardGrad = ctx.createLinearGradient(480, 160, 720, 300);
      cardGrad.addColorStop(0, '#8b5cf6');
      cardGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      ctx.roundRect(485, 170, 230, 130, 14);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('•••• 8849', 510, 260);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('NEOFIN PLATINUM', 510, 210);

      // Analytics Chart mockup
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText('Portfolio Growth', 485, 335);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(485, 410);
      ctx.bezierCurveTo(530, 390, 560, 420, 600, 360);
      ctx.bezierCurveTo(630, 310, 680, 350, 715, 320);
      ctx.stroke();

      // Watermark in client revision
      if (variant === 'client_revision') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('CLIENT DRAFT REVISION', 200, 540);
      }
    });
  }

  /**
   * Design 2: Botanica Organic Matcha (Packaging & Identity)
   */
  async generateBotanica() {
    return this.createDesignCanvas((ctx, w, h) => {
      // Warm Earthy Beige Background
      ctx.fillStyle = '#f5f0ea';
      ctx.fillRect(0, 0, w, h);

      // Olive Green Accent Card
      ctx.fillStyle = '#2d4030';
      ctx.beginPath();
      ctx.roundRect(100, 80, 600, 440, 24);
      ctx.fill();

      // Subtle organic rings
      ctx.strokeStyle = 'rgba(245, 240, 234, 0.15)';
      ctx.lineWidth = 1.5;
      for (let r = 50; r <= 220; r += 35) {
        ctx.beginPath();
        ctx.arc(400, 300, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Title & Packaging Label
      ctx.fillStyle = '#e8d8c3';
      ctx.font = '300 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('— CEREMONIAL GRADE UJI MATCHA —', 400, 180);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Georgia, serif';
      ctx.fillText('BOTANICA', 400, 240);

      ctx.fillStyle = '#9cb399';
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText('Harvested in Kyoto, Japan • 100% Organic', 400, 280);

      // Gold Seal Badge
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(400, 370, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e2d20';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('100g NET', 400, 365);
      ctx.fillText('EST. 2018', 400, 380);
      ctx.textAlign = 'left';
    });
  }

  /**
   * Design 3: Solaris 2026 Cyberpunk Electronic Music Poster
   */
  async generateSolaris() {
    return this.createDesignCanvas((ctx, w, h) => {
      // Dark cyber background
      ctx.fillStyle = '#06020e';
      ctx.fillRect(0, 0, w, h);

      // Radiant Hot Magenta and Electric Cyan Gradients
      const glow = ctx.createLinearGradient(0, 0, w, h);
      glow.addColorStop(0, '#ff007f');
      glow.addColorStop(0.5, '#7928ca');
      glow.addColorStop(1, '#00f0ff');

      // Grid lines
      ctx.strokeStyle = 'rgba(121, 40, 202, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Sun disc
      const sun = ctx.createRadialGradient(400, 280, 20, 400, 280, 160);
      sun.addColorStop(0, '#ff007f');
      sun.addColorStop(0.8, '#ff9900');
      sun.addColorStop(1, 'rgba(255, 0, 127, 0)');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(400, 280, 160, 0, Math.PI * 2);
      ctx.fill();

      // Poster Typography
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('OCTOBER 24-26 // TOKYO BAY', 60, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 68px Impact, sans-serif';
      ctx.fillText('SOLARIS 2026', 60, 160);

      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('SYNTHWAVE • CYBERPUNK • AUDIOVISUAL', 60, 460);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '14px monospace';
      ctx.fillText('TYCHO // GUNSHIP // THE MIDNIGHT // KAVINSKY', 60, 500);
    });
  }

  /**
   * Design 4: Aura Minimalist Architecture Portfolio
   */
  async generateAura() {
    return this.createDesignCanvas((ctx, w, h) => {
      // Clean Architectural Monochrome Warm Slate
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);

      // Clean photo frames mockup
      ctx.fillStyle = '#27272a';
      ctx.fillRect(80, 80, 300, 440);

      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(410, 80, 310, 210);

      ctx.fillStyle = '#52525b';
      ctx.fillRect(410, 310, 310, 210);

      // Minimalist labels
      ctx.fillStyle = '#fafafa';
      ctx.font = '300 24px "Helvetica Neue", sans-serif';
      ctx.fillText('VILLA KAZEN', 105, 130);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '12px "Helvetica Neue", sans-serif';
      ctx.fillText('KYOTO RESIDENCE • 2025', 105, 160);

      ctx.fillStyle = '#ffffff';
      ctx.font = '400 16px "Helvetica Neue", sans-serif';
      ctx.fillText('CONCRETE & CEDAR', 430, 120);
      ctx.fillText('GLASS PAVILION', 430, 350);
    });
  }

  /**
   * Load entire sample pack into DB
   */
  async populateSampleVault(onProgress) {
    const samples = [
      {
        gen: () => this.generateNeoFin('original'),
        title: 'NeoFin Wealth OS Hero Section',
        client: 'Apex Capital Inc.',
        tags: ['Web UI', 'Fintech', 'Dark Mode', 'Hero Banner'],
        notes: 'Original approved master vector design created in June for desktop landing page.'
      },
      {
        gen: () => this.generateBotanica(),
        title: 'Botanica Ceremonial Matcha Packaging',
        client: 'Botanica Botanical Labs',
        tags: ['Packaging', 'Branding', 'Minimalist', 'Print'],
        notes: 'Final print-ready tin can label for Kyoto ceremonial tea line.'
      },
      {
        gen: () => this.generateSolaris(),
        title: 'Solaris 2026 Music Festival Poster',
        client: 'Horizon Live Events',
        tags: ['Poster', 'Cyberpunk', 'Neon', 'Event'],
        notes: 'Official key visual & festival billboard delivered for autumn promotion.'
      },
      {
        gen: () => this.generateAura(),
        title: 'Villa Kazen Architecture Editorial',
        client: 'Studio Aura Architekten',
        tags: ['Editorial', 'Architecture', 'Monochrome', 'Lookbook'],
        notes: 'Clean layout spread for Swiss architectural design magazine.'
      }
    ];

    const total = samples.length;
    for (let i = 0; i < total; i++) {
      const item = samples[i];
      const rendered = await item.gen();
      const features = await window.searchEngine.extractFeatures(rendered.canvas);
      const thumbnail = await window.searchEngine.createThumbnail(rendered.canvas, 360);

      await window.manuDB.addDesign({
        title: item.title,
        client: item.client,
        tags: item.tags,
        notes: item.notes,
        fileName: item.title.toLowerCase().replace(/\s+/g, '-') + '.png',
        fileSize: rendered.blob.size,
        fileType: 'image/png',
        dimensions: { width: rendered.width, height: rendered.height },
        thumbnail,
        imageBlob: rendered.blob,
        features
      });

      if (typeof onProgress === 'function') {
        onProgress(i + 1, total, item.title);
      }
    }

    return true;
  }
}

// Global instance
window.sampleGenerator = new SampleDataGenerator();
