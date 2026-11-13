/* ==========================================================================
   app.js  —  منطق اصلی سایت: صفحه‌ها، مسیریابی، رویدادها
   ========================================================================== */
import * as S from "./store.js";
import { SCHOOL, RULES, QARARGAHS, ROLE_STYLE } from "./config.js";
import { passwordStrength } from "./crypto.js";
import {
  $, $$, fa, esc, signed, fmtDate, icon, gemIcon, logo, svgDefs, avatar,
  toast, openModal, closeModal, modalOpen, ask, countUp, startParticles,
} from "./ui.js";

/* ==========================================================================
   ثابت‌ها و وضعیت
   ========================================================================== */
const NAV = [
  { path: "profile", label: "پروفایل", icon: "user" },
  { path: "school", label: "لیست مدرسه", icon: "trophy" },
  { path: "qarargah", label: "قرارگاه‌ها", icon: "flag" },
  { path: "exams", label: "برنامه امتحانی", icon: "calendar" },
  { path: "classes", label: "کلاس‌ها", icon: "grid" },
  { path: "settings", label: "تنظیمات", icon: "settings" },
];
const ACCENTS = [
  { id: "gold", name: "طلایی", c: "#d9b24a" },
  { id: "emerald", name: "زمردی", c: "#2fd3a2" },
  { id: "sapphire", name: "یاقوتی آبی", c: "#5b8cff" },
  { id: "rose", name: "یاقوت سرخ", c: "#f0647e" },
  { id: "violet", name: "ارغوانی", c: "#9b7bff" },
];

const ui = {
  auth: { tab: "login", step: 1, classId: "", sid: "", q: "" },
  school: { q: "", cls: "all" },
  cls: { q: "" },
  admin: { tab: "gems", classId: "7-1", sel: new Set() },
};
let lastRoute = "";
let stopFx = () => {};

const getRoute = () => {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] || "profile", arg: parts[1] || "" };
};
const go = (path) => { location.hash = "#/" + path; };
const motionOn = () => S.getSettings().motion;

/* ==========================================================================
   اعمال تنظیمات ظاهری
   ========================================================================== */
function applySettings() {
  const s = S.getSettings();
  const r = document.documentElement;
  r.dataset.theme = s.theme;
  r.dataset.accent = s.accent;
  r.dataset.motion = s.motion ? "on" : "off";
  r.dataset.compact = s.compact ? "1" : "0";
  r.style.fontSize = (s.font / 100) * 16 + "px";
}

/* ==========================================================================
   اجزای مشترک
   ========================================================================== */
function badges(s) {
  let h = "";
  if (s.role) h += `<span class="badge b-${ROLE_STYLE[s.role] || "gold"}">${esc(s.role)}</span>`;
  const q = QARARGAHS.find((x) => x.manager === s.name);
  if (q) h += `<span class="badge b-teal">مدیر ${esc(q.title)}</span>`;
  return h;
}

function studentRow(s, { rank, i = 0, showClass = true }) {
  const g = S.gems(s.id);
  const me = S.getSessionId() === s.id;
  const admin = S.isAdmin();
  return `<div class="row ${me ? "me" : ""}" style="--i:${Math.min(i, 18)}">
    ${rank ? `<span class="rank ${rank <= 3 ? "r" + rank : ""}">${fa(rank)}</span>` : ""}
    ${avatar(s.name)}
    <div class="row-main">
      <div class="row-name">${esc(s.name)}${me ? '<span class="you">شما</span>' : ""}</div>
      <div class="row-sub">${showClass ? `<span class="chip"><span class="num">${s.classLabel}</span></span>` : ""}${badges(s)}</div>
    </div>
    <div class="row-gem ${g < 0 ? "neg" : ""}">${gemIcon("gem-sm")}<b class="num">${fa(g)}</b></div>
    ${admin ? `<button class="icon-btn" data-act="edit-gem" data-sid="${s.id}" title="تغییر ${SCHOOL.gemName}" aria-label="تغییر ${SCHOOL.gemName}">${icon("edit", 18)}</button>` : ""}
  </div>`;
}

const pageHead = (title, sub = "", right = "") =>
  `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ""}</div>${right ? `<div class="page-head-r">${right}</div>` : ""}</div>`;

const emptyState = (text) => `<div class="empty">${icon("search", 28)}<p>${text}</p></div>`;

function classChips(active, act, withAll = false) {
  const all = withAll ? `<button class="chip-btn ${active === "all" ? "on" : ""}" data-act="${act}" data-id="all">همه</button>` : "";
  return `<div class="chips">${all}${S.classes
    .map((c) => `<button type="button" class="chip-btn ${active === c.id ? "on" : ""}" data-act="${act}" data-id="${c.id}"><span class="num">${c.label}</span></button>`)
    .join("")}</div>`;
}

/* ==========================================================================
   صفحه ورود / ثبت‌نام
   ========================================================================== */
function authShell() {
  const total = S.students.length;
  return `<div class="auth">
    <canvas id="fx" aria-hidden="true"></canvas>
    <section class="auth-hero">
      <div class="brand-big">${logo(64)}<div><div class="brand-sub">مدرسه</div><h1>${SCHOOL.name}</h1></div></div>
      <p class="hero-line">${SCHOOL.tagline}</p>
      <ul class="feat">
        <li>${icon("shieldcheck", 22)}<div><b>حساب شخصی و امن</b><span>هر دانش‌آموز فقط یک حساب دارد و هیچ‌کس نمی‌تواند وارد حساب دیگری شود.</span></div></li>
        <li>${icon("trophy", 22)}<div><b>رتبه‌بندی زنده ${SCHOOL.gemName}</b><span>پیگیری ${SCHOOL.gemName} خودتان و جایگاه‌تان در مدرسه و کلاس.</span></div></li>
        <li>${icon("flag", 22)}<div><b>قرارگاه‌ها و برنامه امتحانی</b><span>همه‌چیز مدرسه در یک نگاه.</span></div></li>
      </ul>
      <div class="hero-stats">
        <div><b class="num">${fa(total)}</b><span>دانش‌آموز</span></div>
        <div><b class="num">${fa(S.classes.length)}</b><span>کلاس</span></div>
        <div><b class="num">${fa(QARARGAHS.length)}</b><span>قرارگاه</span></div>
      </div>
    </section>
    <section class="auth-card glass">
      <div class="seg" role="tablist">
        <button class="${ui.auth.tab === "login" ? "on" : ""}" data-act="auth-tab" data-tab="login">ورود</button>
        <button class="${ui.auth.tab === "register" ? "on" : ""}" data-act="auth-tab" data-tab="register">ثبت‌نام</button>
      </div>
      <div id="auth-body"></div>
      <div class="auth-foot"><button class="link" data-act="admin-open">${icon("shield", 16)} ورود مدیریت</button></div>
    </section>
  </div>`;
}

function passField(name, label, ph = "") {
  return `<label class="field"><span>${label}</span>
    <div class="input-wrap">${icon("lock", 18)}<input type="password" name="${name}" placeholder="${ph}" autocomplete="${name === "pass" ? "current-password" : "new-password"}" required minlength="6" dir="ltr">
    <button type="button" class="eye" data-act="toggle-pass" tabindex="-1" aria-label="نمایش رمز">${icon("eye", 18)}</button></div></label>`;
}

function authBody() {
  const a = ui.auth;
  if (a.tab === "login") {
    const regs = a.classId ? S.studentsOf(a.classId).filter((s) => S.hasAccount(s.id)) : [];
    return `<h2>خوش آمدید</h2><p class="muted">کلاس خود را انتخاب کنید و وارد حساب شوید.</p>
    <form data-form="login" autocomplete="on">
      <div class="field"><span>کلاس</span>${classChips(a.classId, "auth-class")}</div>
      <label class="field"><span>نام شما</span>
        <div class="input-wrap select">${icon("user", 18)}
        <select name="sid" required ${a.classId ? "" : "disabled"}>
          <option value="">${a.classId ? (regs.length ? "انتخاب کنید…" : "هنوز کسی در این کلاس ثبت‌نام نکرده") : "ابتدا کلاس را انتخاب کنید"}</option>
          ${regs.map((s) => `<option value="${s.id}" ${a.sid === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
        </select></div></label>
      ${passField("pass", "رمز عبور", "••••••••")}
      <div class="row-between"><label class="check"><input type="checkbox" name="remember"><i></i><span>مرا به خاطر بسپار</span></label>
      <button type="button" class="link" data-act="forgot">فراموشی رمز؟</button></div>
      <div class="form-err" id="form-err"></div>
      <button class="btn btn-primary btn-block" type="submit">ورود به حساب</button>
    </form>`;
  }
  /* ثبت‌نام: سه مرحله */
  const steps = ["کلاس", "نام شما", "رمز عبور"];
  const dots = `<ol class="steps">${steps
    .map((t, i) => `<li class="${a.step === i + 1 ? "on" : a.step > i + 1 ? "done" : ""}"><b>${a.step > i + 1 ? icon("check", 14) : fa(i + 1)}</b><span>${t}</span></li>`)
    .join("")}</ol>`;
  if (a.step === 1) {
    return `<h2>ساخت حساب جدید</h2>${dots}
      <p class="muted">کلاس خود را انتخاب کنید.</p>
      <div class="class-pick">${S.classes.map((c) => {
        const regs = S.studentsOf(c.id).filter((s) => S.hasAccount(s.id)).length;
        return `<button class="pick-card ${a.classId === c.id ? "on" : ""}" data-act="auth-class" data-id="${c.id}" data-next="1"><b class="num">${c.label}</b><span>${c.title}</span><small>${fa(regs)} از ${fa(c.students.length)} ثبت‌نام</small></button>`;
      }).join("")}</div>`;
  }
  if (a.step === 2) {
    const list = S.studentsOf(a.classId).filter((s) => !a.q || s.name.includes(a.q.trim()));
    return `<h2>نام خود را پیدا کنید</h2>${dots}
      <div class="input-wrap">${icon("search", 18)}<input type="search" placeholder="جستجوی نام…" value="${esc(a.q)}" data-input="reg-q"></div>
      <div class="pick-list" id="reg-list">${regList(list)}</div>
      <button class="btn btn-ghost btn-block" data-act="auth-step" data-n="1">${icon("back", 18)} تغییر کلاس</button>`;
  }
  const s = S.getStudent(a.sid);
  return `<h2>رمز عبور بسازید</h2>${dots}
    <div class="who">${avatar(s.name)}<div><b>${esc(s.name)}</b><span>کلاس <span class="num">${s.classLabel}</span></span></div></div>
    <form data-form="register" autocomplete="off">
      ${passField("p1", "رمز عبور (حداقل ۶ نویسه)", "یک رمز قوی انتخاب کنید")}
      <div class="meter" id="meter"><i></i><i></i><i></i><i></i><span id="meter-t">—</span></div>
      ${passField("p2", "تکرار رمز عبور", "دوباره وارد کنید")}
      <div class="form-err" id="form-err"></div>
      <button class="btn btn-primary btn-block" type="submit">ساخت حساب و ورود</button>
      <button class="btn btn-ghost btn-block" type="button" data-act="auth-step" data-n="2">${icon("back", 18)} بازگشت</button>
    </form>`;
}

function regList(list) {
  if (!list.length) return emptyState("نامی یافت نشد.");
  return list.map((s) => {
    const taken = S.hasAccount(s.id);
    return `<button class="pick-row ${taken ? "taken" : ""}" ${taken ? "disabled" : ""} data-act="auth-pick" data-sid="${s.id}">
      ${avatar(s.name, "sm")}<span>${esc(s.name)}</span>
      ${taken ? `<em>${icon("lock", 14)} ثبت‌نام شده</em>` : `<em class="free">انتخاب</em>`}</button>`;
  }).join("");
}

function renderAuth() {
  const body = $("#auth-body");
  if (!body) return;
  body.innerHTML = authBody();
  $$(".auth-card .seg button").forEach((b) => b.classList.toggle("on", b.dataset.tab === ui.auth.tab));
}

/* ==========================================================================
   پوسته اصلی (هدر، منوی پایین، نوار مدیر)
   ========================================================================== */
function shell(page, inner) {
  const sid = S.getSessionId();
  const s = sid && S.getStudent(sid);
  const admin = S.isAdmin();
  const set = S.getSettings();
  return `<div class="bgfx" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="#/profile">${logo(36)}<span><small>مدرسه</small><b>${SCHOOL.name}</b></span></a>
    <div class="top-actions">
      ${s ? `<div class="gem-chip" title="${SCHOOL.gemName} شما">${gemIcon("gem-sm")}<b class="num">${fa(S.gems(s.id))}</b></div>` : ""}
      <button class="icon-btn" data-act="toggle-theme" aria-label="تغییر پوسته">${icon(set.theme === "dark" ? "sun" : "moon", 20)}</button>
      <button class="icon-btn" data-act="logout" aria-label="خروج" title="خروج">${icon("logout", 20)}</button>
    </div>
  </header>
  ${admin ? `<div class="adminbar"><span class="pulse"></span><b>حالت مدیر فعال است</b><span class="sp"></span>
      <a class="btn btn-sm btn-primary" href="#/admin">${icon("shield", 16)} مدیریت</a>
      <button class="btn btn-sm btn-ghost" data-act="admin-exit">خروج از حالت مدیر</button></div>` : ""}
  <main id="view" class="view page-${page}">${inner}</main>
  <nav class="dock" aria-label="منوی اصلی">${NAV.map((n) =>
    `<a href="#/${n.path}" class="${page === n.path || (page === "class" && n.path === "classes") || (page === "admin" && n.path === "settings") ? "on" : ""}" aria-label="${n.label}">${icon(n.icon, 22)}<span>${n.label}</span></a>`
  ).join("")}</nav>`;
}

/* ==========================================================================
   صفحه ۱: پروفایل
   ========================================================================== */
function viewProfile() {
  const sid = S.getSessionId();
  if (!sid) return viewAdminOverview();
  const s = S.getStudent(sid);
  const g = S.gems(sid);
  const rank = S.rankOf(sid);
  const rk = S.ranking();
  const classRank = S.studentsOf(s.classId).sort((a, b) => S.gems(b.id) - S.gems(a.id) || a.order - b.order).findIndex((x) => x.id === sid) + 1;
  const classAvg = Math.round(S.totalGems(S.studentsOf(s.classId)) / S.studentsOf(s.classId).length);
  const above = rank > 1 ? rk[rank - 2] : null;
  const gap = above ? S.gems(above.id) - g : 0;
  const hist = S.logFor(sid).slice(0, 8);
  return `<section class="page">
    <div class="hero-card">
      <div class="hero-top">${avatar(s.name, "xl")}
        <div class="hero-id"><h1>${esc(s.name)}</h1>
          <div class="meta"><span class="chip">${s.classLabel.length ? `کلاس <span class="num">${s.classLabel}</span>` : ""}</span>${badges(s)}</div></div></div>
      <div class="gem-panel">
        <div class="gem-glow"></div>
        ${gemIcon("gem-xl")}
        <div><div class="gem-label">${SCHOOL.gemName} شما</div>
        <div class="gem-count num ${g < 0 ? "neg" : ""}" data-count="${g}">${fa(g)}</div></div>
        <p class="gem-note">${g === 0 ? `مسیر شما از صفر آغاز شده است؛ با نظم و مشارکت ${SCHOOL.gemName} کسب کنید.` : g > 0 ? `آفرین! همین مسیر را ادامه دهید.` : `برای جبران، نظم و حضور منظم را رعایت کنید.`}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat">${icon("trophy", 22)}<b class="num">${fa(rank)}</b><span>رتبه در مدرسه از ${fa(rk.length)}</span></div>
      <div class="stat">${icon("users", 22)}<b class="num">${fa(classRank)}</b><span>رتبه در کلاس <span class="num">${s.classLabel}</span></span></div>
      <div class="stat">${icon("chart", 22)}<b class="num">${fa(classAvg)}</b><span>میانگین ${SCHOOL.gemName} کلاس</span></div>
      <div class="stat">${icon("history", 22)}<b class="num">${fa(S.logFor(sid).length)}</b><span>تعداد تغییرات ثبت‌شده</span></div>
    </div>
    ${above ? `<div class="card next"><div class="next-t">${icon("crown", 20)}<span>تا نفر بالاتر (${esc(above.name)}) <b class="num">${fa(gap)}</b> ${SCHOOL.gemName} فاصله دارید</span></div></div>` : rank === 1 && g > 0 ? `<div class="card next"><div class="next-t">${icon("crown", 20)}<span>شما نفر اول مدرسه هستید.</span></div></div>` : ""}
    <div class="grid2">
      <div class="card"><h3>${icon("history", 18)} آخرین تغییرات ${SCHOOL.gemName}</h3>
        ${hist.length ? `<ul class="log">${hist.map((l) => `<li><div><b>${esc(l.reason || (l.delta > 0 ? "افزایش امتیاز" : "کسر امتیاز"))}</b><small>${fmtDate(l.ts)}</small></div>${signed(l.delta)}</li>`).join("")}</ul>` : `<p class="muted pad">هنوز تغییری ثبت نشده است.</p>`}
      </div>
      <div class="card"><h3>${icon("book", 18)} قوانین ${SCHOOL.gemName}</h3>${rulesList()}</div>
    </div>
  </section>`;
}

const rulesList = () => `<ul class="rules">${RULES.map((r) => `<li class="${r.kind}"><span>${esc(r.title)}</span>${signed(r.gems)}</li>`).join("")}</ul>`;

function viewAdminOverview() {
  const rk = S.ranking();
  const top = rk[0];
  return `<section class="page">
    <div class="hero-card admin-hero"><div class="hero-top"><span class="avatar av-xl admin-av">${icon("shield", 38)}</span>
      <div class="hero-id"><h1>حالت مدیر</h1><div class="meta"><span class="badge b-gold">دسترسی کامل</span></div></div></div>
      <p class="muted">در همه صفحه‌ها کنار نام دانش‌آموزان دکمه ویرایش ${SCHOOL.gemName} دیده می‌شود. برای ابزارهای بیشتر وارد پنل مدیریت شوید.</p>
      <div class="hero-btns"><a class="btn btn-primary" href="#/admin">${icon("shield", 18)} پنل مدیریت</a><a class="btn btn-ghost" href="#/school">لیست مدرسه</a></div></div>
    <div class="stats">
      <div class="stat">${icon("users", 22)}<b class="num">${fa(S.students.length)}</b><span>دانش‌آموز</span></div>
      <div class="stat">${icon("lock", 22)}<b class="num">${fa(S.registeredCount())}</b><span>حساب ساخته‌شده</span></div>
      <div class="stat">${icon("chart", 22)}<b class="num">${fa(S.totalGems())}</b><span>مجموع ${SCHOOL.gemName}</span></div>
      <div class="stat">${icon("crown", 22)}<b class="num">${esc(top.name.split(" ")[0])}</b><span>پیشتاز (${fa(S.gems(top.id))} ${SCHOOL.gemName})</span></div>
    </div>
  </section>`;
}

/* ==========================================================================
   صفحه ۲: لیست مدرسه
   ========================================================================== */
function schoolList() {
  const q = ui.school.q.trim();
  const rk = S.ranking();
  const rows = rk.map((s, i) => ({ s, rank: i + 1 })).filter(({ s }) => (ui.school.cls === "all" || s.classId === ui.school.cls) && (!q || s.name.includes(q)));
  if (!rows.length) return emptyState("موردی یافت نشد.");
  return rows.map(({ s, rank }, i) => studentRow(s, { rank, i })).join("");
}

function podium() {
  const rk = S.ranking();
  if (S.gems(rk[0].id) <= 0) return "";
  const p = (s, n) => `<div class="pod p${n}"><div class="pod-av">${n === 1 ? `<span class="crown">${icon("crown", 24)}</span>` : ""}${avatar(s.name, n === 1 ? "lg" : "md")}</div>
    <b>${esc(s.name)}</b><small><span class="num">${s.classLabel}</span></small>
    <div class="pod-bar"><span class="num">${fa(n)}</span><div class="pod-gem">${gemIcon("gem-sm")}<b class="num">${fa(S.gems(s.id))}</b></div></div></div>`;
  return `<div class="podium">${p(rk[1], 2)}${p(rk[0], 1)}${p(rk[2], 3)}</div>`;
}

function viewSchool() {
  return `<section class="page">
    ${pageHead("لیست مدرسه", `رتبه‌بندی همه دانش‌آموزان بر اساس ${SCHOOL.gemName}`, `<div class="pill">${gemIcon("gem-sm")}<span>مجموع <b class="num">${fa(S.totalGems())}</b></span></div>`)}
    ${podium()}
    <div class="toolbar">
      <div class="input-wrap grow">${icon("search", 18)}<input type="search" placeholder="جستجوی نام دانش‌آموز…" value="${esc(ui.school.q)}" data-input="school-q"></div>
      ${classChips(ui.school.cls, "school-class", true)}
    </div>
    <div class="list" id="school-list">${schoolList()}</div>
  </section>`;
}

/* ==========================================================================
   صفحه ۳: قرارگاه‌ها
   ========================================================================== */
function viewQarargah() {
  return `<section class="page">
    ${pageHead("قرارگاه‌ها", "ساختار مدیریتی دانش‌آموزی مدرسه")}
    <div class="q-grid">${QARARGAHS.map((q, i) => {
      const m = S.findByName(q.manager);
      return `<article class="q-card" style="--i:${i}">
        <div class="q-ic">${icon(q.icon, 28)}</div>
        <h3>${esc(q.title)}</h3>
        <p class="muted">${esc(q.desc)}</p>
        <div class="q-mgr"><span class="lbl">مدیر قرارگاه</span>
          <div class="q-mgr-in">${avatar(q.manager)}<div><b>${esc(q.manager)}</b>${m ? `<small>کلاس <span class="num">${m.classLabel}</span></small>` : ""}</div>
          ${m ? `<div class="row-gem">${gemIcon("gem-sm")}<b class="num">${fa(S.gems(m.id))}</b></div>` : ""}
          ${m && S.isAdmin() ? `<button class="icon-btn" data-act="edit-gem" data-sid="${m.id}">${icon("edit", 18)}</button>` : ""}</div></div>
      </article>`;
    }).join("")}</div>
  </section>`;
}

/* ==========================================================================
   صفحه ۴: برنامه امتحانی
   ========================================================================== */
function viewExams() {
  const list = S.getExams();
  const admin = S.isAdmin();
  return `<section class="page">
    ${pageHead("برنامه امتحانی", "تاریخ آزمون‌های پیش‌رو")}
    ${admin ? `<form class="card exam-form" data-form="exam-add"><h3>${icon("plus", 18)} افزودن امتحان</h3>
      <div class="form-row"><input name="title" placeholder="عنوان امتحان" required maxlength="80"><input name="date" placeholder="تاریخ؛ مثال: ۲۰ آبان‌ماه" required maxlength="40"><input name="note" placeholder="توضیحات (اختیاری)" maxlength="120"></div>
      <button class="btn btn-primary" type="submit">افزودن</button></form>` : ""}
    ${list.length ? `<div class="timeline">${list.map((e, i) => `<article class="exam" style="--i:${i}">
      <div class="exam-date">${icon("calendar", 22)}<b>${esc(e.date)}</b></div>
      <div class="exam-body"><h3>${esc(e.title)}</h3>${e.note ? `<p class="muted">${esc(e.note)}</p>` : ""}${i === 0 ? '<span class="badge b-teal">نزدیک‌ترین</span>' : ""}</div>
      ${admin ? `<button class="icon-btn danger" data-act="exam-del" data-id="${esc(e.id)}" aria-label="حذف">${icon("trash", 18)}</button>` : ""}
    </article>`).join("")}</div>` : emptyState("برنامه‌ای ثبت نشده است.")}
  </section>`;
}

/* ==========================================================================
   صفحه ۵: کلاس‌ها
   ========================================================================== */
function viewClasses() {
  const groups = [7, 8, 9].map((g) => ({ g, items: S.classes.filter((c) => c.grade === g) }));
  const gname = { 7: "هفتم", 8: "هشتم", 9: "نهم" };
  return `<section class="page">
    ${pageHead("کلاس‌ها", "برای دیدن اعضا روی هر کلاس بزنید")}
    ${groups.map(({ g, items }) => `<h2 class="sec-t">پایه ${gname[g]}</h2>
      <div class="c-grid">${items.map((c, i) => {
        const st = S.studentsOf(c.id);
        return `<a class="c-card" href="#/class/${c.id}" style="--i:${i}">
          <div class="c-top"><b class="c-num num">${c.label}</b><span class="c-arrow">${icon("back", 18)}</span></div>
          <div class="c-title">${c.title}</div>
          <div class="c-meta"><span>${icon("users", 16)} <b class="num">${fa(st.length)}</b> نفر</span><span>${gemIcon("gem-sm")} <b class="num">${fa(S.totalGems(st))}</b></span></div>
          <div class="stack">${st.slice(0, 5).map((s) => avatar(s.name, "xs")).join("")}<span class="more num">+${fa(Math.max(0, st.length - 5))}</span></div>
        </a>`;
      }).join("")}</div>`).join("")}
  </section>`;
}

function classMembers(c) {
  const q = ui.cls.q.trim();
  const members = S.studentsOf(c.id).filter((s) => !q || s.name.includes(q));
  const rk = S.ranking();
  if (!members.length) return emptyState("موردی یافت نشد.");
  return members.map((s, i) => studentRow(s, { rank: rk.findIndex((x) => x.id === s.id) + 1, i, showClass: false })).join("");
}

function viewClass(id) {
  const c = S.getClass(id);
  if (!c) return viewClasses();
  const st = S.studentsOf(id);
  return `<section class="page">
    <a class="back" href="#/classes">${icon("back", 18)} همه کلاس‌ها</a>
    ${pageHead(`${c.title} — <span class="num">${c.label}</span>`, `${fa(st.length)} عضو`, `<div class="pill">${gemIcon("gem-sm")}<span>مجموع <b class="num">${fa(S.totalGems(st))}</b></span></div>`)}
    <p class="muted hint">عدد کنار هر نام، رتبه فرد در کل مدرسه است.</p>
    <div class="toolbar"><div class="input-wrap grow">${icon("search", 18)}<input type="search" placeholder="جستجو در اعضای کلاس…" value="${esc(ui.cls.q)}" data-input="class-q"></div></div>
    <div class="list" id="class-list">${classMembers(c)}</div>
  </section>`;
}

/* ==========================================================================
   صفحه ۶: تنظیمات
   ========================================================================== */
function viewSettings() {
  const set = S.getSettings();
  const sid = S.getSessionId();
  const s = sid && S.getStudent(sid);
  const admin = S.isAdmin();
  return `<section class="page">
    ${pageHead("تنظیمات", "شخصی‌سازی ظاهر، امنیت حساب و مدیریت")}
    <div class="set-grid">
      <div class="card"><h3>${icon("palette", 18)} ظاهر</h3>
        <div class="set-row"><span>پوسته</span>
          <div class="seg sm"><button class="${set.theme === "dark" ? "on" : ""}" data-act="set-theme" data-v="dark">${icon("moon", 16)} تیره</button><button class="${set.theme === "light" ? "on" : ""}" data-act="set-theme" data-v="light">${icon("sun", 16)} روشن</button></div></div>
        <div class="set-row"><span>رنگ تأکید</span>
          <div class="swatches">${ACCENTS.map((a) => `<button class="sw ${set.accent === a.id ? "on" : ""}" style="--c:${a.c}" data-act="set-accent" data-v="${a.id}" title="${a.name}" aria-label="${a.name}"></button>`).join("")}</div></div>
        <div class="set-row"><span>اندازه نوشته <b class="num" id="font-v">${fa(set.font)}٪</b></span>
          <input type="range" min="85" max="125" step="5" value="${set.font}" data-input="font" class="range"></div>
        <div class="set-row"><span>انیمیشن‌ها</span><label class="switch"><input type="checkbox" ${set.motion ? "checked" : ""} data-change="motion"><i></i></label></div>
        <div class="set-row"><span>نمایش فشرده</span><label class="switch"><input type="checkbox" ${set.compact ? "checked" : ""} data-change="compact"><i></i></label></div>
      </div>

      <div class="card"><h3>${icon("lock", 18)} حساب کاربری</h3>
        ${s ? `<div class="who">${avatar(s.name)}<div><b>${esc(s.name)}</b><span>کلاس <span class="num">${s.classLabel}</span></span></div></div>
          <form data-form="chpass"><div class="form-stack">
            ${passField("old", "رمز فعلی")}${passField("n1", "رمز جدید")}</div>
            <div class="form-err" id="form-err"></div>
            <div class="btn-row"><button class="btn btn-primary" type="submit">تغییر رمز</button><button class="btn btn-ghost" type="button" data-act="logout">${icon("logout", 18)} خروج از حساب</button></div></form>`
          : `<p class="muted">با حساب دانش‌آموزی وارد نشده‌اید.</p><button class="btn btn-ghost" data-act="logout">${icon("logout", 18)} خروج</button>`}
      </div>

      <div class="card admin-card ${admin ? "on" : ""}"><h3>${icon("shield", 18)} مدیریت</h3>
        ${admin ? `<p class="muted">حالت مدیر فعال است. می‌توانید ${SCHOOL.gemName} دانش‌آموزان را تغییر دهید، امتحان اضافه کنید و حساب‌ها را مدیریت کنید.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/admin">${icon("shield", 18)} ورود به پنل مدیریت</a><button class="btn btn-ghost" data-act="admin-exit">خروج از حالت مدیر</button></div>`
        : `<p class="muted">برای تغییر ${SCHOOL.gemName} و کنترل کامل سایت، رمز مدیر را وارد کنید.</p>
          <button class="btn btn-primary" data-act="admin-open">${icon("key", 18)} ورود به حالت مدیر</button>`}
      </div>

      <div class="card"><h3>${icon("download", 18)} داده‌ها</h3>
        <p class="muted">پشتیبان‌گیری از حساب‌ها، تغییرات ${SCHOOL.gemName} و برنامه امتحانی روی همین مرورگر.</p>
        <div class="btn-row"><button class="btn btn-ghost" data-act="backup-dl">${icon("download", 18)} دریافت پشتیبان</button>
        <label class="btn btn-ghost">${icon("upload", 18)} بازگردانی<input type="file" accept="application/json" hidden data-change="backup-up"></label></div>
      </div>

      <div class="card"><h3>${icon("book", 18)} قوانین ${SCHOOL.gemName}</h3>${rulesList()}</div>
      <div class="card about"><div class="about-in">${logo(52)}<div><b>${SCHOOL.name}</b><span>${SCHOOL.tagline}</span><small>نسخه ۱٫۰ — HTML · CSS · JavaScript</small></div></div></div>
    </div>
  </section>`;
}

/* ==========================================================================
   پنل مدیریت
   ========================================================================== */
const ADMIN_TABS = [
  { id: "gems", label: `امتیازدهی ${SCHOOL.gemName}`, icon: "edit" },
  { id: "log", label: "گزارش تغییرات", icon: "history" },
  { id: "accounts", label: "حساب‌ها", icon: "users" },
  { id: "export", label: "خروجی کد", icon: "code" },
  { id: "security", label: "امنیت", icon: "shield" },
];

function adminGems() {
  const cid = ui.admin.classId;
  const st = S.studentsOf(cid);
  const sel = ui.admin.sel;
  return `<div class="grid2 adm-grid">
    <div class="card"><h3>۱. انتخاب دانش‌آموز</h3>
      ${classChips(cid, "adm-class")}
      <label class="check all"><input type="checkbox" data-change="adm-all" ${st.every((s) => sel.has(s.id)) ? "checked" : ""}><i></i><span>انتخاب همه</span></label>
      <div class="check-list">${st.map((s) => `<label class="check row-check"><input type="checkbox" data-sid="${s.id}" data-change="adm-sel" ${sel.has(s.id) ? "checked" : ""}><i></i>${avatar(s.name, "xs")}<span class="grow">${esc(s.name)}</span><b class="num ${S.gems(s.id) < 0 ? "neg" : ""}">${fa(S.gems(s.id))}</b></label>`).join("")}</div>
    </div>
    <div class="card sticky"><h3>۲. اعمال ${SCHOOL.gemName} به <b class="num" id="selcount">${fa(sel.size)}</b> نفر</h3>
      <div class="rule-grid">${RULES.map((r) => `<button class="rule ${r.kind}" data-act="adm-rule" data-id="${r.id}"><span>${esc(r.title)}</span>${signed(r.gems)}</button>`).join("")}</div>
      <form data-form="adm-custom" class="custom"><h4>مقدار دلخواه</h4>
        <div class="stepper"><button type="button" data-act="step" data-d="-1">${icon("minus", 16)}</button><input type="number" name="amount" value="1" step="1"><button type="button" data-act="step" data-d="1">${icon("plus", 16)}</button></div>
        <input name="reason" placeholder="دلیل (اختیاری)" maxlength="80">
        <button class="btn btn-primary btn-block" type="submit">ثبت</button></form>
    </div></div>`;
}

function adminLog() {
  const log = S.allLog().slice(0, 150);
  if (!log.length) return emptyState("هنوز تغییری ثبت نشده است.");
  return `<div class="card"><ul class="log big">${log.map((l) => {
    const s = S.getStudent(l.sid);
    return `<li>${avatar(s.name, "xs")}<div class="grow"><b>${esc(s.name)} <span class="chip"><span class="num">${s.classLabel}</span></span></b><small>${esc(l.reason || "—")} · ${fmtDate(l.ts)}</small></div>${signed(l.delta)}
      <button class="icon-btn danger" data-act="undo-log" data-id="${l.id}" title="بازگردانی" aria-label="بازگردانی">${icon("history", 18)}</button></li>`;
  }).join("")}</ul></div>`;
}

function adminAccounts() {
  const regs = S.students.filter((s) => S.hasAccount(s.id));
  return `<div class="card"><h3>${icon("users", 18)} حساب‌های ساخته‌شده <span class="muted">(<span class="num">${fa(regs.length)}</span> از <span class="num">${fa(S.students.length)}</span>)</span></h3>
    <p class="muted">اگر دانش‌آموزی رمز و کد بازیابی خود را گم کرد، حسابش را حذف کنید تا دوباره ثبت‌نام کند.</p>
    ${regs.length ? `<ul class="log big">${regs.map((s) => `<li>${avatar(s.name, "xs")}<div class="grow"><b>${esc(s.name)}</b><small>کلاس <span class="num">${s.classLabel}</span></small></div><button class="btn btn-sm btn-danger" data-act="acc-del" data-sid="${s.id}">${icon("trash", 16)} حذف حساب</button></li>`).join("")}</ul>` : emptyState("هنوز حسابی ساخته نشده است.")}</div>`;
}

function adminExport() {
  return `<div class="card"><h3>${icon("code", 18)} خروجی کد <code>js/data.js</code></h3>
    <p class="muted">این کد شامل ${SCHOOL.gemName} نهایی هر نفر است. آن را جایگزین محتوای فایل <code dir="ltr">js/data.js</code> کنید و روی گیت‌هاب ثبت کنید تا برای همه دیده شود. سپس «پاک‌سازی تغییرات محلی» را بزنید تا امتیازها دوبار حساب نشوند.</p>
    <textarea readonly dir="ltr" class="code" id="export-code" rows="12">${esc(S.exportDataJs())}</textarea>
    <div class="btn-row"><button class="btn btn-primary" data-act="copy-export">${icon("copy", 18)} کپی کد</button>
    <button class="btn btn-ghost" data-act="dl-export">${icon("download", 18)} دانلود data.js</button>
    <button class="btn btn-danger" data-act="clear-log">${icon("trash", 18)} پاک‌سازی تغییرات محلی</button></div></div>`;
}

function adminSecurity() {
  return `<div class="card"><h3>${icon("key", 18)} ساخت هش رمز مدیر جدید</h3>
    <p class="muted">رمز جدید را بنویسید، هش تولیدشده را در فایل <code dir="ltr">js/config.js</code> مقدار <code dir="ltr">ADMIN.hash</code> قرار دهید. رمز اصلی هرگز در کد ذخیره نمی‌شود.</p>
    <form data-form="mkhash"><div class="form-stack">${passField("np", "رمز جدید مدیر")}</div><button class="btn btn-primary" type="submit">تولید هش</button></form>
    <textarea readonly dir="ltr" class="code" id="hash-out" rows="2" placeholder="هش اینجا نمایش داده می‌شود"></textarea>
    <div class="note">${icon("alert", 18)}<span>توجه: چون فعلاً سایت بدون سرور است، امنیت حساب‌ها فقط در سطح مرورگر است. پس از خرید هاست، ثبت‌نام و رمزها باید روی سرور نگهداری شود.</span></div></div>`;
}

function viewAdmin() {
  const tab = ui.admin.tab;
  const body = { gems: adminGems, log: adminLog, accounts: adminAccounts, export: adminExport, security: adminSecurity }[tab]();
  return `<section class="page">
    ${pageHead("پنل مدیریت", `کنترل کامل ${SCHOOL.gemName}، حساب‌ها و داده‌ها`)}
    <div class="tabs">${ADMIN_TABS.map((t) => `<button class="${tab === t.id ? "on" : ""}" data-act="adm-tab" data-id="${t.id}">${icon(t.icon, 18)}<span>${t.label}</span></button>`).join("")}</div>
    <div id="adm-body">${body}</div>
  </section>`;
}

/* ==========================================================================
   مودال تغییر جنم
   ========================================================================== */
function openGemModal(sid) {
  const s = S.getStudent(sid);
  if (!s || !S.isAdmin()) return;
  const g = S.gems(sid);
  const recent = S.logFor(sid).slice(0, 4);
  openModal(`<div class="modal-head">${avatar(s.name, "lg")}<div><div class="modal-title">${esc(s.name)}</div><div class="meta"><span class="chip">کلاس <span class="num">${s.classLabel}</span></span>${badges(s)}</div></div>
      <button class="icon-btn" data-act="modal-close" aria-label="بستن">${icon("x", 20)}</button></div>
    <div class="modal-gem">${gemIcon("gem-lg")}<div><small>${SCHOOL.gemName} فعلی</small><b class="num ${g < 0 ? "neg" : ""}">${fa(g)}</b></div>
      <div class="mg-meta"><span>پایه فایل: <b class="num">${fa(s.baseGems)}</b></span><span>تغییرات مدیر: <b class="num">${fa(S.localDelta(sid))}</b></span></div></div>
    <div class="rule-grid">${RULES.map((r) => `<button class="rule ${r.kind}" data-act="gem-rule" data-sid="${sid}" data-id="${r.id}"><span>${esc(r.title)}</span>${signed(r.gems)}</button>`).join("")}</div>
    <form data-form="gem-custom" data-sid="${sid}" class="custom"><h4>مقدار دلخواه</h4>
      <div class="custom-row"><div class="stepper"><button type="button" data-act="step" data-d="-1">${icon("minus", 16)}</button><input type="number" name="amount" value="1" step="1"><button type="button" data-act="step" data-d="1">${icon("plus", 16)}</button></div>
      <input name="reason" placeholder="دلیل (اختیاری)" maxlength="80"><button class="btn btn-primary" type="submit">ثبت</button></div></form>
    ${recent.length ? `<ul class="log mini">${recent.map((l) => `<li><div><b>${esc(l.reason || "—")}</b><small>${fmtDate(l.ts)}</small></div>${signed(l.delta)}</li>`).join("")}</ul>` : ""}`);
}

function openAdminLogin() {
  openModal(`<div class="modal-head"><span class="modal-ic">${icon("shield", 26)}</span><div><div class="modal-title">ورود مدیر</div><p class="muted">رمز مدیر را وارد کنید.</p></div></div>
    <form data-form="admin-login">${passField("pass", "رمز مدیر")}<div class="form-err" id="form-err"></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">انصراف</button><button class="btn btn-primary" type="submit">ورود</button></div></form>`);
}

function openForgot() {
  const regs = S.students.filter((s) => S.hasAccount(s.id));
  openModal(`<div class="modal-head"><span class="modal-ic">${icon("key", 26)}</span><div><div class="modal-title">بازیابی رمز</div><p class="muted">کد بازیابی هنگام ساخت حساب به شما نشان داده شده است.</p></div></div>
    <form data-form="forgot"><label class="field"><span>نام شما</span><div class="input-wrap select">${icon("user", 18)}<select name="sid" required><option value="">انتخاب کنید…</option>
      ${S.classes.map((c) => `<optgroup label="${c.title} ${c.label}">${S.studentsOf(c.id).filter((s) => S.hasAccount(s.id)).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</optgroup>`).join("")}
    </select></div></label>
    <label class="field"><span>کد بازیابی</span><div class="input-wrap">${icon("key", 18)}<input name="code" dir="ltr" placeholder="XXXX-XXXX-XXXX-XXXX" required autocomplete="off"></div></label>
    ${passField("np", "رمز جدید")}
    <div class="form-err" id="form-err"></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">انصراف</button><button class="btn btn-primary" type="submit" ${regs.length ? "" : "disabled"}>تغییر رمز</button></div></form>`);
}

function showRecovery(code, then) {
  openModal(`<div class="modal-head"><span class="modal-ic ok">${icon("shieldcheck", 26)}</span><div><div class="modal-title">حساب شما ساخته شد</div><p class="muted">این کد بازیابی فقط یک‌بار نمایش داده می‌شود. آن را جایی امن نگه دارید؛ برای بازیابی رمز لازم است.</p></div></div>
    <div class="code-box" dir="ltr">${code}</div>
    <div class="modal-actions"><button class="btn btn-ghost" data-act="copy-code" data-code="${code}">${icon("copy", 18)} کپی</button><button class="btn btn-primary" data-act="modal-close">ذخیره کردم، ادامه</button></div>`, { onClose: then });
}

/* ==========================================================================
   رندر اصلی
   ========================================================================== */
function render() {
  const root = $("#app");
  const sid = S.getSessionId();
  const admin = S.isAdmin();
  const { page, arg } = getRoute();
  const key = `${sid || ""}|${admin}|${page}|${arg}`;
  const same = key === lastRoute;
  const y = window.scrollY;
  lastRoute = key;
  applySettings();

  if (!sid && !admin) {
    stopFx();
    root.className = "";
    root.innerHTML = authShell();
    renderAuth();
    stopFx = startParticles($("#fx"));
    window.scrollTo(0, 0);
    return;
  }
  stopFx(); stopFx = () => {};

  let inner;
  let p = page;
  if (p === "admin" && !admin) { p = "settings"; history.replaceState(null, "", "#/settings"); }
  switch (p) {
    case "school": inner = viewSchool(); break;
    case "qarargah": inner = viewQarargah(); break;
    case "exams": inner = viewExams(); break;
    case "classes": inner = viewClasses(); break;
    case "class": inner = viewClass(arg); break;
    case "settings": inner = viewSettings(); break;
    case "admin": inner = viewAdmin(); break;
    default: p = "profile"; inner = viewProfile();
  }
  root.className = same ? "same" : "";
  root.innerHTML = shell(p, inner);
  if (!same) { window.scrollTo(0, 0); countUp(root, motionOn()); }
  else window.scrollTo(0, y);
  if (same) $$("[data-count]", root).forEach((el) => (el.textContent = fa(el.dataset.count)));
}

/* ==========================================================================
   اکشن‌ها (کلیک)
   ========================================================================== */
function gemApply(sids, delta, reason) {
  let n = 0;
  sids.forEach((id) => { if (S.addGem(id, delta, reason, true)) n++; });
  if (n) {
    S.notify();
    const t = `${delta > 0 ? "+" : ""}${fa(delta)} ${SCHOOL.gemName} برای ${fa(n)} نفر ثبت شد`;
    toast(t, delta > 0 ? "ok" : "warn");
  }
  return n;
}

const acts = {
  /* ---- ورود / ثبت‌نام ---- */
  "auth-tab": (el) => { ui.auth = { tab: el.dataset.tab, step: 1, classId: ui.auth.classId, sid: "", q: "" }; renderAuth(); },
  "auth-class": (el) => {
    ui.auth.classId = el.dataset.id; ui.auth.sid = "";
    if (el.dataset.next) { ui.auth.step = 2; ui.auth.q = ""; }
    renderAuth();
  },
  "auth-pick": (el) => { ui.auth.sid = el.dataset.sid; ui.auth.step = 3; renderAuth(); },
  "auth-step": (el) => { ui.auth.step = Number(el.dataset.n); renderAuth(); },
  "toggle-pass": (el) => {
    const inp = el.parentElement.querySelector("input");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    el.innerHTML = icon(show ? "eyeoff" : "eye", 18);
  },
  forgot: openForgot,
  "admin-open": openAdminLogin,
  "admin-exit": () => { S.adminLogout(); toast("از حالت مدیر خارج شدید.", "info"); if (getRoute().page === "admin") go("settings"); },
  logout: async () => {
    if (await ask("خروج", "می‌خواهید از حساب خود خارج شوید؟", "خروج")) {
      S.adminLogout(); S.logout(); toast("خارج شدید.", "info"); go("profile");
    }
  },
  /* ---- مودال ---- */
  "modal-close": closeModal,
  "bg-close": (el, e) => { if (e.target === el) closeModal(); },
  "copy-code": (el) => copyText(el.dataset.code),
  /* ---- تنظیمات ---- */
  "toggle-theme": () => { S.setSetting("theme", S.getSettings().theme === "dark" ? "light" : "dark"); render(); },
  "set-theme": (el) => { S.setSetting("theme", el.dataset.v); render(); },
  "set-accent": (el) => { S.setSetting("accent", el.dataset.v); render(); },
  "backup-dl": () => download("fatehan-backup.json", S.exportBackup(), "application/json"),
  /* ---- فهرست‌ها ---- */
  "school-class": (el) => { ui.school.cls = el.dataset.id; render(); },
  /* ---- امتحان ---- */
  "exam-del": async (el) => {
    if (await ask("حذف امتحان", "این امتحان از برنامه حذف شود؟", "حذف", true)) {
      S.saveExams(S.getExams().filter((e) => e.id !== el.dataset.id)); toast("حذف شد.", "info");
    }
  },
  /* ---- جنم ---- */
  "edit-gem": (el) => openGemModal(el.dataset.sid),
  "gem-rule": (el) => {
    const r = RULES.find((x) => x.id === el.dataset.id);
    gemApply([el.dataset.sid], r.gems, r.title);
    openGemModal(el.dataset.sid);
  },
  step: (el) => {
    const inp = el.parentElement.querySelector("input");
    inp.value = (Number(inp.value) || 0) + Number(el.dataset.d);
  },
  /* ---- پنل مدیریت ---- */
  "adm-tab": (el) => { ui.admin.tab = el.dataset.id; render(); },
  "adm-class": (el) => { ui.admin.classId = el.dataset.id; ui.admin.sel.clear(); render(); },
  "adm-rule": (el) => {
    const r = RULES.find((x) => x.id === el.dataset.id);
    if (!ui.admin.sel.size) return toast("ابتدا دانش‌آموز را انتخاب کنید.", "err");
    gemApply([...ui.admin.sel], r.gems, r.title);
  },
  "undo-log": (el) => { S.removeLog(Number(el.dataset.id)); toast("تغییر بازگردانی شد.", "info"); },
  "acc-del": async (el) => {
    const s = S.getStudent(el.dataset.sid);
    if (await ask("حذف حساب", `حساب «${s.name}» حذف شود؟ او می‌تواند دوباره ثبت‌نام کند.`, "حذف", true)) { S.deleteAccount(s.id); toast("حساب حذف شد.", "info"); }
  },
  "copy-export": () => copyText($("#export-code").value),
  "dl-export": () => download("data.js", S.exportDataJs(), "text/javascript"),
  "clear-log": async () => {
    if (await ask("پاک‌سازی تغییرات محلی", "فقط وقتی انجام دهید که کد جدید data.js را جایگزین کرده‌اید. ادامه می‌دهید؟", "پاک‌سازی", true)) { S.clearLog(); toast("پاک‌سازی شد.", "info"); }
  },
};

function copyText(t) {
  const done = () => toast("کپی شد.", "ok");
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback);
  else fallback();
  function fallback() {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch { toast("کپی نشد؛ دستی کپی کنید.", "err"); }
    ta.remove();
  }
}
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const fn = acts[el.dataset.act];
  if (fn) fn(el, e);
});

/* ==========================================================================
   فرم‌ها
   ========================================================================== */
const showErr = (form, msg) => { const b = $("#form-err", form); if (b) { b.textContent = msg; b.classList.add("show"); } };

const forms = {
  login(f) {
    const d = new FormData(f);
    const r = S.login(d.get("sid"), d.get("pass"), !!d.get("remember"));
    if (!r.ok) { showErr(f, r.error); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); return; }
    toast("خوش آمدید!", "ok"); go("profile"); render();
  },
  register(f) {
    const d = new FormData(f);
    const p1 = d.get("p1"), p2 = d.get("p2");
    if (p1.length < 6) return showErr(f, "رمز باید حداقل ۶ نویسه باشد.");
    if (p1 !== p2) return showErr(f, "تکرار رمز با رمز اصلی یکسان نیست.");
    if (passwordStrength(p1) < 1) return showErr(f, "رمز بیش از حد ساده است.");
    const r = S.register(ui.auth.sid, p1);
    if (!r.ok) return showErr(f, r.error);
    ui.auth = { tab: "login", step: 1, classId: "", sid: "", q: "" };
    go("profile"); render();
    showRecovery(r.code);
  },
  forgot(f) {
    const d = new FormData(f);
    if (String(d.get("np")).length < 6) return showErr(f, "رمز جدید باید حداقل ۶ نویسه باشد.");
    const r = S.recover(d.get("sid"), d.get("code"), d.get("np"));
    if (!r.ok) return showErr(f, r.error);
    closeModal(); go("profile"); render();
    setTimeout(() => showRecovery(r.code), 250);
  },
  "admin-login"(f) {
    const r = S.adminLogin(new FormData(f).get("pass"));
    if (!r.ok) return showErr(f, r.error);
    closeModal(); toast("حالت مدیر فعال شد.", "ok"); go("admin"); render();
  },
  chpass(f) {
    const d = new FormData(f);
    if (String(d.get("n1")).length < 6) return showErr(f, "رمز جدید باید حداقل ۶ نویسه باشد.");
    const r = S.changePassword(S.getSessionId(), d.get("old"), d.get("n1"));
    if (!r.ok) return showErr(f, r.error);
    f.reset(); toast("رمز عبور تغییر کرد.", "ok");
  },
  "exam-add"(f) {
    const d = new FormData(f);
    S.saveExams([...S.getExams(), { id: "e" + Date.now(), title: d.get("title").trim(), date: d.get("date").trim(), note: d.get("note").trim() }]);
    toast("امتحان افزوده شد.", "ok");
  },
  "gem-custom"(f) {
    const d = new FormData(f);
    const amount = Math.round(Number(d.get("amount")));
    if (!amount) return toast("مقدار نامعتبر است.", "err");
    const reason = String(d.get("reason") || "").trim() || (amount > 0 ? "افزایش دستی" : "کسر دستی");
    if (f.dataset.sid) { gemApply([f.dataset.sid], amount, reason); openGemModal(f.dataset.sid); }
    else {
      if (!ui.admin.sel.size) return toast("ابتدا دانش‌آموز را انتخاب کنید.", "err");
      gemApply([...ui.admin.sel], amount, reason);
    }
  },
  "adm-custom"(f) { forms["gem-custom"](f); },
  mkhash(f) { $("#hash-out").value = S.makeAdminHash(new FormData(f).get("np")); },
};

document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-form]");
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

/* ==========================================================================
   ورودی‌های زنده (جستجو، اسلایدر، چک‌باکس)
   ========================================================================== */
document.addEventListener("input", (e) => {
  const t = e.target;
  const k = t.dataset && t.dataset.input;
  if (t.name === "p1" && t.closest("[data-form=register]")) {
    const s = passwordStrength(t.value);
    const m = $("#meter");
    m.dataset.s = t.value ? s : 0;
    $("#meter-t").textContent = t.value ? ["بسیار ضعیف", "ضعیف", "متوسط", "خوب", "عالی"][s] : "—";
  }
  if (!k) return;
  if (k === "school-q") { ui.school.q = t.value; $("#school-list").innerHTML = schoolList(); }
  else if (k === "class-q") { ui.cls.q = t.value; $("#class-list").innerHTML = classMembers(S.getClass(getRoute().arg)); }
  else if (k === "reg-q") {
    ui.auth.q = t.value;
    $("#reg-list").innerHTML = regList(S.studentsOf(ui.auth.classId).filter((s) => !t.value || s.name.includes(t.value.trim())));
  } else if (k === "font") {
    S.setSetting("font", Number(t.value));
    document.documentElement.style.fontSize = (Number(t.value) / 100) * 16 + "px";
    $("#font-v").textContent = fa(t.value) + "٪";
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  const k = t.dataset && t.dataset.change;
  if (!k) return;
  if (k === "motion" || k === "compact") { S.setSetting(k, t.checked); applySettings(); }
  else if (k === "adm-sel") {
    t.checked ? ui.admin.sel.add(t.dataset.sid) : ui.admin.sel.delete(t.dataset.sid);
    $("#selcount").textContent = fa(ui.admin.sel.size);
    const all = $("[data-change=adm-all]"); if (all) all.checked = S.studentsOf(ui.admin.classId).every((s) => ui.admin.sel.has(s.id));
  } else if (k === "adm-all") {
    S.studentsOf(ui.admin.classId).forEach((s) => (t.checked ? ui.admin.sel.add(s.id) : ui.admin.sel.delete(s.id)));
    $$("[data-change=adm-sel]").forEach((c) => (c.checked = t.checked));
    $("#selcount").textContent = fa(ui.admin.sel.size);
  } else if (k === "backup-up") {
    const file = t.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => (S.importBackup(String(rd.result)) ? toast("پشتیبان بازگردانی شد.", "ok") : toast("فایل پشتیبان معتبر نیست.", "err"));
    rd.readAsText(file);
  } else if (k === "login-sid") ui.auth.sid = t.value;
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modalOpen()) closeModal(); });

/* ==========================================================================
   راه‌اندازی
   ========================================================================== */
S.subscribe(() => render());
window.addEventListener("hashchange", render);

document.body.insertAdjacentHTML("afterbegin", svgDefs());
applySettings();
render();
