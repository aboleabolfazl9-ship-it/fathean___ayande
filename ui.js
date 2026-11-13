/* ==========================================================================
   ui.js  —  ابزارهای رابط کاربری: آیکون‌ها، آواتار، پیام‌ها، مودال، افکت‌ها
   ========================================================================== */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const DIG = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (n) => String(n).replace(/\d/g, (d) => DIG[d]).replace(/-/g, "−");
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const signed = (n) => `<span class="num ${n > 0 ? "pos" : n < 0 ? "neg" : ""}">${n > 0 ? "+" : ""}${fa(n)}</span>`;

export function fmtDate(ts) {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(ts);
  } catch { return new Date(ts).toLocaleString(); }
}

/* ---------- آیکون‌ها ---------- */
const P = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/>',
  shieldcheck: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.4 3.5 5.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.3 4.2M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  culture: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  media: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  order: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  wisdom: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  energy: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M3 20h18"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h7"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.8 2-1.8 0-1.2-1-1.4-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
};
export const icon = (name, size = 20, cls = "") =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

export const gemIcon = (cls = "") =>
  `<svg class="gem ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gemGrad)"/><path d="M2 9h20M9 3L7 9l5 12M15 3l2 6-5 12" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8" stroke-linejoin="round"/></svg>`;

export const logo = (size = 44) =>
  `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2.5l18.5 10.7v21.6L24 45.5 5.5 34.8V13.2z" fill="url(#logoGrad)"/><path d="M15 30l9-9 9 9M15 22.5l9-9 9 9" fill="none" stroke="#0a1020" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const svgDefs = () =>
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-soft)"/><stop offset=".55" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-deep)"/></linearGradient>
    <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-soft)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient>
  </defs></svg>`;

/* ---------- آواتار ---------- */
function hue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
export function initials(name) {
  const w = name.trim().split(/\s+/);
  return w.length > 1 ? `${w[0][0]}<i></i>${w[w.length - 1][0]}` : w[0][0];
}
export const avatar = (name, size = "md") =>
  `<span class="avatar av-${size}" style="--h:${hue(name)}">${initials(name)}</span>`;

/* ---------- پیام کوتاه (Toast) ---------- */
export function toast(msg, type = "info") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = `toast t-${type}`;
  t.innerHTML = `<span class="t-ic">${icon(type === "err" ? "alert" : type === "warn" ? "alert" : "check", 18)}</span><span>${esc(msg)}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 300); }, 3400);
}

/* ---------- مودال ---------- */
let modalClose = null;
export function openModal(html, { wide = false, onClose } = {}) {
  let root = $("#modal-root");
  if (!root) { root = document.createElement("div"); root.id = "modal-root"; document.body.appendChild(root); }
  const fresh = !root.firstChild;
  root.innerHTML = `<div class="modal-back ${fresh ? "" : "static"}" data-act="bg-close"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add("modal-open");
  modalClose = onClose || null;
  const first = $("input:not([type=hidden]):not([type=checkbox]), textarea", root);
  if (first && fresh) setTimeout(() => first.focus(), 60);
}
export function closeModal() {
  const root = $("#modal-root");
  if (!root || !root.firstChild) return;
  const back = root.firstChild;
  back.classList.add("out");
  document.body.classList.remove("modal-open");
  const cb = modalClose; modalClose = null;
  setTimeout(() => { if (back.parentNode === root) root.innerHTML = ""; }, 180);
  if (cb) cb();
}
export const modalOpen = () => !!($("#modal-root") && $("#modal-root").firstChild);

/** پنجره تأیید — Promise<boolean> */
export function ask(title, text, okLabel = "تأیید", danger = false) {
  return new Promise((resolve) => {
    openModal(`<div class="modal-title">${esc(title)}</div><p class="muted">${esc(text)}</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-ask="0">انصراف</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ask="1">${esc(okLabel)}</button></div>`);
    const root = $("#modal-root");
    const h = (e) => {
      const b = e.target.closest("[data-ask]");
      if (!b) return;
      root.removeEventListener("click", h);
      closeModal();
      resolve(b.dataset.ask === "1");
    };
    root.addEventListener("click", h);
  });
}

/* ---------- شمارنده انیمیشنی ---------- */
export function countUp(root, enabled = true) {
  $$("[data-count]", root).forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    if (!enabled || to === 0) { el.textContent = fa(to); return; }
    const start = performance.now(), dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fa(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- ذرات متحرک پس‌زمینه صفحه ورود ---------- */
export function startParticles(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  let w, h, raf, running = true;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  const N = Math.round(Math.min(60, (window.innerWidth * window.innerHeight) / 24000));
  const ps = Array.from({ length: N }, () => ({
    x: Math.random() * w, y: Math.random() * h, s: 3 + Math.random() * 7,
    v: 0.12 + Math.random() * 0.35, a: 0.08 + Math.random() * 0.3, r: Math.random() * Math.PI, rv: (Math.random() - 0.5) * 0.01,
  }));
  const color = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d4af37";
  let col = color();
  const draw = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.y -= p.v; p.r += p.rv;
      if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = p.a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.8, 0); ctx.lineTo(0, p.s); ctx.lineTo(-p.s * 0.8, 0); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    raf = requestAnimationFrame(draw);
  };
  if (document.documentElement.dataset.motion !== "off") draw();
  return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
}
