// Fallback canvas chart engine when offline
window.Chart = window.Chart || class {
  constructor(ctx, config) {
    this.ctx = ctx.getContext ? ctx.getContext('2d') : ctx;
    this.canvas = ctx.canvas || ctx;
    this.config = config;
    this.render();
  }
  destroy() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  update() { this.render(); }
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width || 400;
    const h = this.canvas.height || 220;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px system-ui, sans-serif';
    const type = this.config.type;
    const data = this.config.data;
    if (!data || !data.datasets || !data.datasets[0]) return;

    if (type === 'doughnut' || type === 'pie') {
      const ds = data.datasets[0];
      const total = ds.data.reduce((a, b) => a + b, 0) || 1;
      let startAngle = -0.5 * Math.PI;
      const centerX = w / 2;
      const centerY = h / 2 - 15;
      const radius = Math.min(w, h) / 3;
      ds.data.forEach((val, i) => {
        const slice = (val / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
        if (type === 'doughnut') {
          ctx.arc(centerX, centerY, radius * 0.55, startAngle + slice, startAngle, true);
        } else {
          ctx.lineTo(centerX, centerY);
        }
        ctx.closePath();
        ctx.fillStyle = (ds.backgroundColor && ds.backgroundColor[i]) || '#0d6efd';
        ctx.fill();
        startAngle += slice;
      });
      let lx = 20;
      data.labels.forEach((label, i) => {
        ctx.fillStyle = (ds.backgroundColor && ds.backgroundColor[i]) || '#0d6efd';
        ctx.fillRect(lx, h - 25, 12, 12);
        ctx.fillStyle = '#495057';
        ctx.fillText(`${label}: ${ds.data[i]}`, lx + 16, h - 15);
        lx += ctx.measureText(`${label}: ${ds.data[i]}`).width + 25;
      });
    } else if (type === 'bar' || type === 'line') {
      const ds = data.datasets[0];
      const maxVal = Math.max(...ds.data, 10);
      const padding = 35;
      const chartW = w - padding * 2;
      const chartH = h - padding * 2;
      ctx.strokeStyle = '#dee2e6';
      ctx.beginPath();
      ctx.moveTo(padding, 20);
      ctx.lineTo(padding, h - padding);
      ctx.lineTo(w - 20, h - padding);
      ctx.stroke();

      const stepX = chartW / Math.max(data.labels.length, 1);
      if (type === 'bar') {
        ds.data.forEach((val, i) => {
          const barH = (val / maxVal) * chartH;
          const x = padding + i * stepX + 10;
          const y = h - padding - barH;
          ctx.fillStyle = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : (ds.backgroundColor || '#0d6efd');
          ctx.fillRect(x, y, Math.max(stepX - 20, 15), barH);
          ctx.fillStyle = '#6c757d';
          ctx.textAlign = 'center';
          ctx.fillText(data.labels[i] || '', x + (stepX - 20)/2, h - padding + 15);
          ctx.fillText(val, x + (stepX - 20)/2, y - 5);
        });
      } else {
        ctx.strokeStyle = ds.borderColor || '#0d6efd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ds.data.forEach((val, i) => {
          const pointH = (val / maxVal) * chartH;
          const x = padding + i * stepX + stepX / 2;
          const y = h - padding - pointH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ds.data.forEach((val, i) => {
          const pointH = (val / maxVal) * chartH;
          const x = padding + i * stepX + stepX / 2;
          const y = h - padding - pointH;
          ctx.fillStyle = ds.borderColor || '#0d6efd';
          ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*Math.PI); ctx.fill();
          ctx.fillStyle = '#6c757d';
          ctx.textAlign = 'center';
          ctx.fillText(data.labels[i] || '', x, h - padding + 15);
          ctx.fillText(val, x, y - 8);
        });
      }
    }
  }
};
