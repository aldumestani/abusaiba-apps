/* حُرّاس أبوصيبع الرقميّون — Abusaiba Digital Guardians */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NATIVE = window.native || null;
  const STORE_KEY = 'harras';

  // ====================== التخزين ======================
  const DEFAULT_SETTINGS = {
    school: 'مدرسة أبوصيبع الابتدائية للبنين', teacher: 'أ. جهاد محمد الدمستاني',
    teacherTitle: 'اختصاصي تكنولوجيا التعليم', principal: 'أ. حسين علي الدرازي', sound: true, music: true,
  };
  let DB = { version: 1, settings: { ...DEFAULT_SETTINGS }, students: {}, seal: '' };
  let ME = null;
  const APP_NAME = 'حُرّاس أبوصيبع الرقميّون';
  // تعديلات المعلم: إعدادات الشهادة + الأسئلة المعدّلة (تُحفظ في مجلد DigitalGuardians-Custom بجانب exe)
  let CUSTOM = { settings: {}, lessons: {} }, LETTERHEAD = null;
  const SET = () => ({ ...DEFAULT_SETTINGS, ...DB.settings, ...CUSTOM.settings });
  // ---- حماية لوحة المعلم: كلمة مرور مجزّأة (PBKDF2) + توقيع ملف التعديلات (HMAC) ----
  const SIGN_KEY = 'Kkju6MubV03erZ6Bkv94Apis8GL5kDTB';
  const RECOVERY = { salt: '500c54b41929d8ee785cbde1f339821f', hash: '4ac9bfabc2a4b66662bba68bb8b8ded23663aae1f5c821991e1b5b8665fe300b' };
  const PASS_ITER = 150000;
  const enc = new TextEncoder();
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  const unhex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
  async function pbkdf2(pw, saltHex) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: PASS_ITER }, k, 256));
  }
  async function sign(text) {
    const k = await crypto.subtle.importKey('raw', enc.encode(SIGN_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
  }
  const sigText = (c, lh) => JSON.stringify({ settings: c.settings, lessons: c.lessons, letterhead: lh || '' });
  const hasPass = () => !!(CUSTOM.settings.pass && CUSTOM.settings.pass.hash);
  const checkPass = async pw => hasPass() && await pbkdf2(pw, CUSTOM.settings.pass.salt) === CUSTOM.settings.pass.hash;
  const checkRecovery = async k => await pbkdf2(k.toUpperCase().replace(/[^0-9A-Z]/g, ''), RECOVERY.salt) === RECOVERY.hash;
  async function setPass(pw) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); CUSTOM.settings.pass = { salt, hash: await pbkdf2(pw, salt) }; await saveCustom(); }
  const passError = pw => pw.length < 8 || !/[A-Za-z\u0600-\u06FF]/.test(pw) || !/\d/.test(pw) ? 'كلمة المرور يجب أن تكون <b>8 خانات على الأقل</b> وفيها <b>حروف وأرقام</b>.' : '';
  let PENDING = null; // ملف تعديلات غير موقّع أو تم العبث به: لا يُطبَّق حتى يعتمده المعلم
  // الويب: تعديلات المعلم في متصفحه، وإلا ملف custom.json الموقّع المرفوع بجانب التطبيق على الموقع
  async function webCustom() {
    const loc = localStorage.getItem(STORE_KEY + '-custom');
    if (loc) return { data: JSON.parse(loc), letterhead: localStorage.getItem(STORE_KEY + '-lh') };
    if (location.protocol !== 'file:') try { const res = await fetch('custom.json', { cache: 'no-cache' }); if (res.ok) { const d = await res.json(); return { data: d, letterhead: d.letterhead || null }; } } catch (e) {}
    return { data: null };
  }
  async function loadCustom() {
    try {
      const r = NATIVE ? await NATIVE.loadCustom() : await webCustom();
      if (r.data) {
        const c = { settings: r.data.settings || {}, lessons: r.data.lessons || {} };
        if (r.data.sig && r.data.sig === await sign(sigText(c, r.letterhead))) { CUSTOM = c; LETTERHEAD = r.letterhead || null; }
        else { delete c.settings.pass; delete c.settings.pin; PENDING = { data: c, letterhead: r.letterhead || null }; }
      }
    } catch (e) {}
    for (const it of FLAT) { if (!it.orig) it.orig = it.cards; it.cards = CUSTOM.lessons[it.key] || it.orig; }
  }
  async function saveCustom() {
    try {
      const out = { settings: CUSTOM.settings, lessons: CUSTOM.lessons, sig: await sign(sigText(CUSTOM, LETTERHEAD)) };
      if (NATIVE) await NATIVE.saveCustom(out); else { localStorage.setItem(STORE_KEY + '-custom', JSON.stringify(out)); LETTERHEAD ? localStorage.setItem(STORE_KEY + '-lh', LETTERHEAD) : localStorage.removeItem(STORE_KEY + '-lh'); }
    } catch (e) { toast('❌ تعذّر حفظ التعديلات'); }
  }

  async function loadDB() {
    let d = null;
    try { d = NATIVE ? await NATIVE.load() : JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    if (d && d.students) {
      DB = d; DB.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
      if (d.seal && d.seal !== Codes.seal(d.students)) DB.settings.tampered = new Date().toISOString();
    }
  }
  let saveTimer = null;
  function save() {
    DB.seal = Codes.seal(DB.students);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { NATIVE ? await NATIVE.save(DB) : localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) { console.error(e); }
    }, 150);
  }

  // ====================== الأصوات ======================
  const SFX = {};
  ['tap', 'correct', 'wrong', 'hit', 'defeat', 'win', 'badge', 'whoosh', 'tick', 'pop'].forEach(n => { const a = new Audio('sounds/' + n + '.mp3'); a.preload = 'auto'; SFX[n] = a; });
  function play(n) {
    if (!DB.settings.sound || !SFX[n]) return;
    try { const a = SFX[n].cloneNode(); a.volume = n === 'tick' ? .5 : .8; a.play().catch(() => {}); } catch (e) {}
  }
  const music = new Audio('sounds/music.mp3'); music.loop = true; music.volume = .22;
  function syncMusic() { if (DB.settings.music && ME) music.play().catch(() => {}); else music.pause(); }
  // نطق المصطلحات الإنجليزية (صوت ويندوز، بدون إنترنت)
  let voice = null;
  function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  function say(word) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; u.rate = .8; if (voice) u.voice = voice;
      music.volume = .06; u.onend = () => { music.volume = .22; };
      speechSynthesis.speak(u);
    } catch (e) {}
    if (ME) {
      ME.heard = ME.heard || {};
      if (!ME.heard[word]) { ME.heard[word] = 1; save(); const got = checkBadges(ME); got.forEach(b => badgeToast(b.badge)); }
    }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-say]');
    if (t) { e.stopPropagation(); t.classList.add('heard'); t.classList.remove('nudge'); say(t.dataset.say); $$('.say-hint').forEach(h => h.remove()); }
  }, true);

  // ====================== أدوات ======================
  function fmt(t) {
    t = esc(t || '');
    t = t.replace(/\[\[([^\]]+)\]\]/g, (_, w) => `<button class="term ${ME && ME.heard && ME.heard[w] ? 'heard' : 'nudge'}" data-say="${w}" title="اضغط لتسمع النطق"><span class="ltr">${w}</span> 🔊</button>`);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return t.replace(/\n/g, '<br>');
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmtDate = d => new Date(d).toLocaleDateString('ar-BH-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const classLabel = s => `الصف ${s.grade} / ${s.section}`;
  const show = id => { $$('.screen').forEach(e => e.classList.add('hidden')); $('#' + id).classList.remove('hidden'); };
  const NAMES = { guide: 'درع', salman: 'سلمان', cat: 'بسبوسة', fox: 'الثعلب خمّن', parrot: 'الببغاء ثرثار', fisher: 'الصيّاد أبو رابط', cloud: 'غيمة نكد', masked: 'المتنكّر مجهول', monster: 'الوحش شاشون', virus: 'الفيروس فرفور' };
  const face = (who, mood) => `<div class="face f-${who}">${ART.CHARS[who](mood)}</div>`;

  function confetti() {
    const em = ['🎉', '⭐', '🎊', '✨', '💜', '🛡️'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div'); s.className = 'confetti';
      s.textContent = em[i % em.length]; s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = 2 + Math.random() * 2 + 's'; s.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(s); setTimeout(() => s.remove(), 5000);
    }
  }
  function modal(html, cls = '') {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${cls}">${html}</div>`;
    $('#modalRoot').appendChild(bg);
    return { el: bg, close: () => bg.remove() };
  }
  function confirmBox(msg, yes = 'نعم', no = 'إلغاء') {
    return new Promise(res => {
      const m = modal(`<div class="m-face">${ART.cat()}</div><p style="font-size:20px">${msg}</p><div class="row"><button class="btn bad" data-y>${yes}</button><button class="btn ghost" data-n>${no}</button></div>`);
      $('[data-y]', m.el).onclick = () => { m.close(); res(true); };
      $('[data-n]', m.el).onclick = () => { m.close(); res(false); };
    });
  }
  function toast(msg) {
    const m = modal(`<p style="font-size:19px">${msg}</p><button class="btn">حسناً</button>`);
    $('button', m.el).onclick = m.close;
  }
  function badgeToast(b) {
    play('badge');
    const t = document.createElement('div'); t.className = 'badge-toast';
    t.innerHTML = `<span class="bi">${b.icon}</span><div><b>وسام جديد!</b><br>${esc(b.title)}</div>`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3600);
  }

  // ====================== المنهج ======================
  const FLAT = [];
  STAGES.forEach(st => st.items.forEach((it, i) => { it.key = st.id + '-' + (i + 1); it.ref = '' + st.id + (i + 1); it.stage = st; FLAT.push(it); }));
  const FINAL = { id: 7, icon: '🏆', color: '#e6a100', title: 'الحارس الرقمي المحترف', en: 'Pro Digital Guardian', certName: 'شهادة الحارس الرقمي المحترف', final: true };
  const XP = { lesson: 10, mission: 15, boss: 25 };
  const isDone = (s, it) => !!s.done[it.key];
  // وضع الفعالية: قسم واحد مفتوح (CUSTOM.settings.focusStage)، وطالب الديمو «المفتوح» يتنقّل بحرية
  const focusId = () => String(SET().focusStage || '');
  function isUnlocked(s, it) { const i = FLAT.indexOf(it); return i === 0 || s.demo === 'open' || isDone(s, FLAT[i - 1]) || (focusId() === String(it.stage.id) && it === it.stage.items[0]); }
  const stageDone = (s, st) => st.items.every(it => isDone(s, it));
  const allDone = s => STAGES.every(st => stageDone(s, st));
  const itemTitle = ref => { const it = FLAT.find(x => x.ref === ref); return it ? `${it.stage.title} ← ${it.title}` : '؟'; };

  function addCode(s, kind, ref, title) {
    const exists = s.codes.find(c => c.kind === kind && c.ref === ref);
    if (exists) return exists;
    const date = new Date().toISOString();
    const rec = { code: Codes.make(kind, ref, s, date), kind, ref, title, date };
    s.codes.push(rec); return rec;
  }
  function checkBadges(s, ctx = {}) {
    const got = [];
    const items = FLAT.filter(it => it.type !== 'boss' && isDone(s, it)).length;
    const cond = {
      1: items >= 1, 2: !!ctx.perfect, 3: items >= 5, 4: items >= 15, 5: Object.keys(s.heard || {}).length >= 10,
      6: s.xp >= 100, 7: s.xp >= 300, 14: !!ctx.speed, 15: allDone(s),
    };
    STAGES.forEach((st, i) => { cond[8 + i] = stageDone(s, st); });
    for (const b of BADGES) {
      if (cond[b.id] && !s.badges[b.id]) {
        s.badges[b.id] = new Date().toISOString();
        got.push({ badge: b, rec: addCode(s, 'B', String(b.id).padStart(2, '0'), 'وسام: ' + b.title) });
      }
    }
    return got;
  }

  // ====================== شاشة الدخول ======================
  function renderLogin() {
    ME = null; syncMusic();
    if (SET().closed) { $('#login').innerHTML = `<div class="login-box"><div class="big-emoji">⏸️</div><h1 class="app-title">${APP_NAME}</h1><p style="font-size:22px">${esc(SET().closedMsg || 'التطبيق متوقف مؤقتاً. نراكم قريباً! 👋')}</p></div>`; return show('login'); }
    const list = Object.values(DB.students).filter(s => !s.demo).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    const grades = [1, 2, 3, 4, 5, 6].map(g => `<option value="${g}" ${g === 5 ? 'selected' : ''}>الصف ${g}</option>`).join('');
    const secs = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">شعبة ${i + 1}</option>`).join('');
    $('#login').innerHTML = `
      <div class="login-box">
        <div class="hero">${ART.appCover()}
          <div class="hero-title"><h1>حُرّاس أبوصيبع الرقميّون</h1><p class="ltr">Abusaiba Digital Guardians</p></div></div>
        <p class="tagline">تعلّم كيف تحمي نفسك على الإنترنت… وتهزم الأشرار الرقميين! 🛡️</p>
        ${list.length ? `<h3>👋 اختر اسمك</h3><div class="students">${list.map(s => `
          <div class="stu" data-id="${s.id}"><div class="avatar">${esc(s.name.trim()[0] || '؟')}</div>
          <div class="n">${esc(s.name)}</div><div class="c">${classLabel(s)} · ⭐ ${s.xp}</div></div>`).join('')}</div>` : ''}
        <div class="new-stu">
          <h3>✨ حارس جديد؟ سجّل اسمك</h3>
          <div class="row">
            ${nameFields('n')}
            <select class="field" id="nGrade">${grades}</select>
            <select class="field" id="nSec">${secs}</select>
          </div>
          <div style="margin-top:14px"><button class="btn big" id="nGo">ابدأ المغامرة 🚀</button></div>
        </div>
        <div class="credit-line">${esc(SET().school)}</div>
        <button class="btn ghost sm" id="impBtn" style="margin-top:6px">📥 عندي كود من جهاز آخر</button>
        <div class="dev-credit">فكرة وتطوير: أستاذ جهاد الدمستاني
          <a href="#" id="igLink" class="ig" dir="ltr"><img src="instagram.png" alt=""><span class="ltr">@jehadmstani</span></a></div>
      </div>`;
    $$('.stu').forEach(e => e.onclick = () => { play('tap'); enter(DB.students[e.dataset.id]); });
    $('#nGo').onclick = createStudent;
    $('#n3').onkeydown = e => { if (e.key === 'Enter') createStudent(); };
    $('#impBtn').onclick = askTransfer;
    $('#igLink').onclick = e => { e.preventDefault(); const u = 'https://www.instagram.com/jehadmstani/'; NATIVE ? NATIVE.openURL(u) : window.open(u); };
    show('login');
  }
  // ---- الاسم: ثلاث خانات (الأول، الثاني، الثالث) ----
  const NAME_PH = ['الاسم الأول', 'الاسم الثاني', 'الاسم الثالث'];
  const nameFields = (p, name = '') => { const w = name.split(' '); const v = [w[0] || '', w[1] || '', w.slice(2).join(' ')];
    return NAME_PH.map((ph, i) => `<input class="field name-part" id="${p}${i + 1}" placeholder="${ph}" maxlength="20" value="${esc(v[i])}">`).join(''); };
  const readName = (p, root = document) => [1, 2, 3].map(i => $('#' + p + i, root).value.replace(/\s+/g, ' ').trim());
  const nameError = parts => parts.some(x => !x) ? 'اكتب اسمك <b>الأول والثاني والثالث</b> كما سيظهر في الشهادة 📜' : '';
  const sameName = (a, b) => Codes.normName(a.name) === Codes.normName(b.name) && a.grade === b.grade && a.section === b.section;
  const nameLocked = s => Object.keys(s.done).length > 0;
  async function createStudent() {
    const parts = readName('n'), name = parts.join(' ');
    const grade = +$('#nGrade').value, section = +$('#nSec').value;
    if (nameError(parts)) return toast(nameError(parts));
    const dup = Object.values(DB.students).find(s => Codes.normName(s.name) === Codes.normName(name) && s.grade === grade && s.section === section);
    if (dup) { if (await confirmBox(`يوجد طالب بنفس الاسم والصف: <b>${esc(dup.name)}</b>. هل هذا أنت؟`, 'نعم، أنا', 'لا')) return enter(dup); return; }
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    DB.students[id] = { id, name, grade, section, created: new Date().toISOString(), xp: 0, done: {}, codes: [], badges: {}, heard: {} };
    save(); track('register', 'تسجيل طالب جديد'); enter(DB.students[id], true);
  }
  function enter(s, isNew) {
    ME = s; s.last = new Date().toISOString(); save(); syncMusic(); renderHome();
    if (isNew) welcome();
  }
  function welcome() {
    const m = modal(`<div class="welcome">
      <div class="w-row">${face('guide')}<div class="bubble">أهلاً يا ${esc(ME.name.split(' ')[0])}! أنا <b>درع</b> 🤖 حارس الإنترنت. سأدرّبك لتصبح <b>حارساً رقمياً</b> وتهزم الأشرار الرقميين!</div></div>
      <div class="w-row rev">${face('cat', 'laugh')}<div class="bubble">وأنا <b>بسبوسة</b> 🐱 ونصيحتي الأولى: عندما ترى كلمة إنجليزية بجانبها 🔊 اضغط عليها لتسمع نطقها! جرّب: ${fmt('[[Password]]')}</div></div>
      <button class="btn big" data-go>هيّا نبدأ! 🚀</button></div>`, 'wide');
    $('[data-go]', m.el).onclick = () => { play('tap'); m.close(); };
  }

  // ====================== الصفحة الرئيسية ======================
  const ICON = { lesson: '📘', mission: '🎯', boss: '⚔️' };
  const LABEL = { lesson: 'درس', mission: 'مهمّة', boss: 'مواجهة الشرير' };
  function renderHome(scrollToCurrent = true) {
    const s = ME;
    const nb = Object.keys(s.badges).length;
    const nextIt = FLAT.find(it => !isDone(s, it));
    $('#home').innerHTML = `
      <div class="topbar">
        <div class="avatar">${esc(s.name.trim()[0])}</div>
        <div class="who"><b style="color:var(--ink)">${esc(s.name)}</b>${nameLocked(s) ? '' : ' <button class="iconbtn sm" id="nameBtn" title="تعديل اسمي">✏️</button>'}<div class="c">${classLabel(s)}</div></div>
        <div class="spacer"></div>
        <span class="pill" title="نقاط الخبرة XP">⭐ ${s.xp} XP</span>
        <span class="pill" title="الأوسمة">🏅 ${nb}</span>
        <button class="btn ghost sm" id="achBtn">🎖️ إنجازاتي وشهاداتي</button>
        <button class="btn ghost sm" id="moveBtn">📲 جهاز آخر</button>
        <button class="btn ghost sm" id="dicBtn">📖 قاموسي 🔊</button>
        <button class="iconbtn" id="musBtn" title="الموسيقى">${DB.settings.music ? '🎵' : '🔕'}</button>
        <button class="iconbtn" id="sndBtn" title="المؤثرات الصوتية">${DB.settings.sound ? '🔊' : '🔇'}</button>
        <button class="iconbtn" id="outBtn" title="خروج">🚪</button>
      </div>
      <div class="home-wrap">${allDone(s) ? `<div class="final-banner">${face('guide')}<div><b>🏆 أنت الآن حارس رقمي محترف!</b><br>هزمت كل الأشرار الرقميين.</div><button class="btn ok" data-cert="7">📜 الشهادة الكبرى</button></div>` : ''}
      ${focusId() ? `<div class="focus-banner">🎯 فعالية اليوم: ${esc((STAGES.find(x => String(x.id) === focusId()) || {}).title || '')}</div>` : ''}${STAGES.map((st, si) => {
        if (focusId() && focusId() !== String(st.id)) return '';
        const done = st.items.filter(it => isDone(s, it)).length;
        const locked = si > 0 && s.demo !== 'open' && !focusId() && !stageDone(s, STAGES[si - 1]);
        const won = stageDone(s, st);
        const cert = s.codes.find(c => c.kind === 'C' && c.ref === String(st.id));
        return `<section class="stage ${locked ? 'locked' : ''}" style="--sc:${st.color}">
          <div class="stage-cover">${ART.cover(st.id, won)}
            <div class="sc-text"><div class="en">Stage ${st.id} · ${st.en}</div><h2>المرحلة ${st.id}: ${st.title}</h2><p>${st.desc}</p>
            <div class="stage-prog"><i style="width:${done / st.items.length * 100}%"></i></div></div>
            ${locked ? '<div class="sc-lock">🔒</div>' : ''}</div>
          ${cert ? `<div class="cert-ready"><span style="font-size:34px">📜</span><div style="flex:1"><b>مبروك! حصلت على ${esc(st.certName)}</b></div><button class="btn sm" data-cert="${st.id}">عرض الشهادة</button></div>` : ''}
          <div class="path">${st.items.map(it => {
            const d = isDone(s, it), u = isUnlocked(s, it);
            const cls = d ? 'done' : u ? 'current' : 'locked';
            const dot = it.type === 'boss' ? `<div class="boss-face">${ART.CHARS[st.villain]()}</div>` : (d ? '✓' : u ? ICON[it.type] : '🔒');
            return `<div class="node ${cls} n-${it.type}" data-key="${it.key}" ${it === nextIt ? 'id="nextNode"' : ''}>
              <div class="dot">${dot}${d && s.done[it.key].perfect ? '<span class="badge-done">★</span>' : ''}${it.type === 'boss' && d ? '<span class="ko">✔</span>' : ''}</div>
              <div class="t">${esc(it.title)}</div><div class="e">${esc(it.en)}</div>
              <div class="xp">${ICON[it.type]} ${LABEL[it.type]} · +${XP[it.type]} XP</div></div>`;
          }).join('')}</div>
          ${locked ? `<div class="lock-note">🔒 اهزم شرير المرحلة ${st.id - 1} لفتح هذه المرحلة</div>` : ''}
        </section>`;
      }).join('')}</div>`;
    $$('.node').forEach(n => n.onclick = () => {
      const it = FLAT.find(x => x.key === n.dataset.key);
      if (!isUnlocked(s, it)) { play('wrong'); return toast('🔒 هذا مقفل. أكمل ما قبله أولاً!'); }
      play('tap'); startItem(it);
    });
    $$('[data-cert]').forEach(b => b.onclick = () => showCert(s, +b.dataset.cert === 7 ? FINAL : STAGES.find(x => x.id === +b.dataset.cert)));
    $('#achBtn').onclick = showAchievements;
    $('#moveBtn').onclick = showTransfer;
    if (!nameLocked(s)) $('#nameBtn').onclick = () => editMyName(false, () => renderHome(false));
    $('#dicBtn').onclick = showDictionary;
    $('#outBtn').onclick = renderLogin;
    $('#sndBtn').onclick = () => { DB.settings.sound = !DB.settings.sound; save(); renderHome(false); };
    $('#musBtn').onclick = () => { DB.settings.music = !DB.settings.music; save(); syncMusic(); renderHome(false); };
    show('home');
    if (scrollToCurrent) setTimeout(() => { const n = $('#nextNode'); if (n) n.scrollIntoView({ block: 'center' }); else $('#home').scrollTop = 0; }, 50);
  }

  // ====================== مشغّل الدرس ======================
  let P = null;
  const NO_CHECK = { intro: 1, recap: 1, story: 1 };
  const SELF_CHECK = { sort: 1, hotspot: 1, chat: 1, meter: 1 };   // أنشطة تتحقق بنفسها أثناء اللعب
  function startItem(it, preview = false) {
    const boss = it.type === 'boss' && !preview;
    P = { it, cards: it.cards, queue: it.cards.map((_, i) => i), pos: 0, mistakes: 0, wrongCards: {},
      hearts: boss ? 3 : null, hp: boss ? it.cards.length : 0, review: preview || isDone(ME, it), speedWon: false, preview };
    show('player');
    if (boss && !P.review) return bossIntro(it);
    renderCard();
  }
  const curCard = () => P.cards[P.queue[P.pos]];
  function bossHUD() {
    const st = P.it.stage, max = P.cards.length;
    return `<div class="boss-hud"><div class="bh-face" id="bhFace">${ART.CHARS[st.villain]()}</div>
      <div class="bh-mid"><div class="bh-name">${NAMES[st.villain]}</div><div class="bh-bar"><i style="width:${P.hp / max * 100}%"></i></div></div>
      <div class="hearts">${'❤️'.repeat(Math.max(0, P.hearts))}${'🤍'.repeat(3 - Math.max(0, P.hearts))}</div></div>`;
  }
  function bossIntro(it) {
    const st = it.stage;
    $('#player').innerHTML = `<div class="boss-intro" style="--sc:${st.color}">
      <div class="bi-villain">${ART.CHARS[st.villain]()}</div>
      <div class="bubble big">${fmt(it.taunt || 'هاهاها! لن تهزمني!')}</div>
      <div class="bi-vs">⚔️ مواجهة ${NAMES[st.villain]}</div>
      <p class="bi-rules">كل إجابة صحيحة = ضربة للشرير 💥 &nbsp;·&nbsp; لديك 3 قلوب ❤️❤️❤️</p>
      <div class="row"><button class="btn big" id="biGo">ابدأ المواجهة! 🛡️</button><button class="btn ghost" id="biBack">ليس الآن</button></div></div>`;
    play('pop');
    $('#biGo').onclick = () => { play('tap'); renderCard(); };
    $('#biBack').onclick = () => renderHome();
  }
  function renderCard() {
    const c = curCard();
    P.state = 'idle'; P.answer = null; P.fails = 0; P.ui = {}; P.cardMist = 0;
    clearInterval(P.timer);
    const pct = P.pos / P.queue.length * 100;
    const again = P.pos >= P.cards.length;
    const boss = P.it.type === 'boss' && !P.preview;
    $('#player').innerHTML = `
      <div class="p-top">
        <button class="iconbtn" id="pX" title="خروج">✖</button>
        ${P.review ? `<button class="iconbtn" id="pPrev" title="السابق" ${P.pos === 0 ? 'disabled' : ''}>›</button>` : ''}
        <div class="p-prog"><i style="width:${pct}%"></i></div>
        ${P.review ? `<button class="iconbtn" id="pNext" title="التالي">‹</button>` : ''}
        <div class="p-title">${esc(P.it.title)}</div>
      </div>
      ${boss ? bossHUD() : ''}
      <div class="p-body"><div class="card ${['hotspot', 'chat', 'sort'].includes(c.t) ? 'wide' : ''}" id="card">${again ? '<div class="again">🔁 سؤال للمراجعة — حاول مرة أخرى!</div>' : ''}</div></div>
      <div class="p-bottom" id="pBottom"><div class="fb" id="fb"></div><button class="btn" id="pBtn"></button></div>`;
    $('#pX').onclick = async () => { if (P.preview) { clearInterval(P.timer); return endPreview(); } if (P.review || await confirmBox('هل تريد الخروج؟ سيضيع تقدّمك هنا.', 'خروج', 'أكمل')) { clearInterval(P.timer); renderHome(); } };
    if (P.review) {
      $('#pPrev').onclick = () => { if (P.pos > 0) { P.pos--; renderCard(); } };
      $('#pNext').onclick = () => next();
    }
    const holder = document.createElement('div'); $('#card').appendChild(holder);
    RENDER[c.t](holder, c);
    if (NO_CHECK[c.t]) setBottom('continue');
    else if (SELF_CHECK[c.t]) setBottom('wait', c.t === 'meter' ? '' : '<span class="muted">أكمل النشاط بالأعلى ⬆️</span>');
    else setBottom('check');
    sayHint();
  }
  // تلميح بسبوسة: أول مرة تظهر كلمة إنجليزية لم يسمعها الطالب
  function sayHint() {
    const t = $('.card .term.nudge'); if (!t || !ME || P.hinted || Object.keys(ME.heard || {}).length >= 3) return;
    P.hinted = true;
    const h = document.createElement('div'); h.className = 'say-hint';
    h.innerHTML = `<div class="sh-face">${ART.cat('laugh')}</div><div>اضغط على <b>الكلمة الإنجليزية</b> لتسمع نطقها! 🔊</div>`;
    $('#card').prepend(h); play('pop');
  }
  function setBottom(mode, fbHtml = '', tone = '') {
    const b = $('#pBottom'), btn = $('#pBtn');
    b.className = 'p-bottom ' + tone; $('#fb').innerHTML = fbHtml;
    btn.className = 'btn' + (tone === 'ok' ? ' ok' : tone === 'bad' ? ' bad' : '');
    P.mode = mode;
    if (mode === 'continue') { btn.textContent = 'متابعة ←'; btn.disabled = false; btn.onclick = next; }
    else if (mode === 'wait') { btn.textContent = 'متابعة ←'; btn.disabled = true; }
    else if (mode === 'retry') { btn.textContent = 'حاول مرة أخرى'; btn.disabled = false; btn.onclick = () => { const c = curCard(); RENDER[c.t]($('#card > div:last-child'), c); setBottom(SELF_CHECK[c.t] ? 'wait' : 'check'); }; }
    else { btn.textContent = 'تحقّق ✓'; btn.onclick = check; updateCheck(); }
  }
  function updateCheck() {
    const btn = $('#pBtn'); if (!btn || P.mode !== 'check') return;
    const c = curCard();
    btn.disabled = !(READY[c.t] ? READY[c.t](c) : true);
  }
  const PRAISE = ['أحسنت يا حارس! 🛡️', 'رائع! 🌟', 'ممتاز يا بطل! 💪', 'صحيح! 👏', 'إجابة ذكية! 🧠', 'درع فخور بك! 🤖', 'بسبوسة تصفّق لك! 🐱👏', 'لا يمكن خداعك! 😎'];
  const OOPS = ['أوه! ليس تماماً 🙈', 'اقتربت! 🤏', 'الشرير يضحك… هاهاها 😈', 'لا بأس، نتعلّم من الخطأ 💡'];
  async function check() {
    const c = curCard();
    $('#pBtn').disabled = true;
    const r = await CHECK[c.t](c);
    result(r.ok, r.msg, c);
  }
  // النتيجة النهائية لأي بطاقة (تستدعيها البطاقات ذات التحقق الذاتي أيضاً)
  function result(ok, msg, c = curCard()) {
    const idx = P.queue[P.pos];
    if (P.it.type === 'boss' && !P.preview) return bossResult(ok, msg, c);
    if (ok) {
      play('correct');
      return setBottom('continue', pick(PRAISE) + (msg ? `<small>${msg}</small>` : '') + (c.why ? `<small>${fmt(c.why)}</small>` : '') + (c.joke ? `<small class="joke">😂 ${fmt(c.joke)}</small>` : ''), 'ok');
    }
    play('wrong'); P.fails++;
    if (!P.wrongCards[idx]) { P.wrongCards[idx] = 1; P.mistakes++; }
    if (SELF_CHECK[c.t]) return setBottom('retry', (msg || pick(OOPS)), 'bad');
    REVEAL[c.t] && REVEAL[c.t](c);
    let note = '';
    if (!P.review) { P.queue.push(idx); note = '<small>🔁 لا بأس! سيعود هذا السؤال في آخر الدرس.</small>'; }
    setBottom('continue', pick(OOPS) + (msg ? `<small>${msg}</small>` : '') + (c.why ? `<small>${fmt(c.why)}</small>` : '') + note, 'bad');
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function bossResult(ok, msg, c) {
    const f = $('#bhFace');
    if (ok) {
      P.hp--; play('hit'); f.classList.remove('hurt'); void f.offsetWidth; f.classList.add('hurt');
      $('.bh-bar i').style.width = (P.hp / P.cards.length * 100) + '%';
      const boom = document.createElement('div'); boom.className = 'boom'; boom.textContent = pick(['💥', 'بووم!', '⚡', 'طاخ!']); f.appendChild(boom); setTimeout(() => boom.remove(), 700);
      return setBottom('continue', 'ضربة موفّقة! 💥' + (c.why ? `<small>${fmt(c.why)}</small>` : ''), 'ok');
    }
    P.hearts--; P.mistakes++; play('wrong'); f.classList.remove('laugh'); void f.offsetWidth; f.classList.add('laugh');
    $('.hearts').innerHTML = '❤️'.repeat(Math.max(0, P.hearts)) + '🤍'.repeat(3 - Math.max(0, P.hearts));
    if (P.hearts <= 0) return setTimeout(quizFail, 600);
    REVEAL[c.t] && REVEAL[c.t](c);
    setBottom('continue', 'هاهاها! خسرت قلباً 💔' + (msg ? `<small>${msg}</small>` : '') + (c.why ? `<small>${fmt(c.why)}</small>` : ''), 'bad');
  }
  function next() {
    clearInterval(P.timer);
    P.pos++;
    if (P.pos >= P.queue.length) { if (P.preview) return endPreview(); if (P.review) return renderHome(false); return P.it.type === 'boss' ? bossDefeat() : finishItem(); }
    renderCard();
    $('.p-body').scrollTop = 0;
  }
  function bossDefeat() {
    const st = P.it.stage;
    $('#player').innerHTML = `<div class="boss-intro won" style="--sc:${st.color}">
      <div class="bi-villain defeated">${ART.CHARS[st.villain](st.villain === 'cloud' ? 'happy' : undefined)}<div class="poof">💨</div></div>
      <div class="bubble big">${fmt(P.it.defeat || 'لااااا! لقد هُزمت!')}</div></div>`;
    play('defeat');
    setTimeout(finishItem, 2300);
  }
  // معاينة المعلم: يعود للوحة المعلم بدل الواجهة
  function endPreview() { const k = P.it.key; P = null; show('login'); teacherPanel('lessons', k); }
  function quizFail() {
    const st = P.it.stage;
    const m = modal(`<div class="m-face">${ART.CHARS[st.villain]()}</div><div class="done-title">انتهت القلوب! 💔</div>
      <p style="font-size:19px">${esc(NAMES[st.villain])} يضحك الآن… لكن الحارس الحقيقي لا يستسلم! راجع الدروس ثم عُد لتهزمه 💪</p>
      <div class="row"><button class="btn" data-r>إعادة المواجهة</button><button class="btn ghost" data-h>العودة للدروس</button></div>`);
    $('[data-r]', m.el).onclick = () => { m.close(); startItem(P.it); };
    $('[data-h]', m.el).onclick = () => { m.close(); renderHome(); };
  }

  // تعديل/تأكيد الاسم مع معاينة الشهادة. confirm=true: عند إنهاء أول درس (بعده يُقفل الاسم)
  // ---- نقل التقدّم إلى جهاز آخر: كود من 16 رقماً، موقّع ومرتبط باسم الطالب وصفّه (بلا خادم ولا حسابات) ----
  // التقدّم متسلسل، فيكفي عدد الدروس المنجزة + النقاط + أوسمة لا تُستنتج + نسخة + توقيع 30 بت = 53 بت < 16 رقماً
  const SITE_URL = 'https://abusaiba-apps.com/guardians/';
  const FLAG_BADGES = [2, 5, 14];
  const P30 = 1073741824n;
  const sig30 = (w, n, xp, f) => { let h = 0; for (const ch of Codes.seal(['T', n, xp, f, Codes.normName(w.name), w.grade, w.section])) h = (h * 31 + ch.charCodeAt(0)) % 1073741824; return h; };
  function transferCode(s) {
    let n = 0; while (n < FLAT.length && isDone(s, FLAT[n])) n++;
    const xp = Math.min(s.xp, 4095), f = FLAG_BADGES.reduce((a, id, i) => a | (s.badges[id] ? 1 << i : 0), 0);
    const v = (((BigInt(n) * 4096n + BigInt(xp)) * 8n + BigInt(f)) * 4n + 1n) * P30 + BigInt(sig30(s, n, xp, f));
    return String(v).padStart(16, '0').replace(/(\d{4})(?=\d)/g, '$1-');
  }
  function readCode(code, w) {
    const d = String(code).replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/\D/g, '');
    if (d.length !== 16) return null;
    let v = BigInt(d); const sig = Number(v % P30); v /= P30;
    const ver = Number(v % 4n); v /= 4n; const f = Number(v % 8n); v /= 8n; const xp = Number(v % 4096n), n = Number(v / 4096n);
    return ver === 1 && n <= FLAT.length && sig === sig30(w, n, xp, f) ? { n, xp, f } : null;
  }
  const stageCertTitle = st => st.certName;
  function applyCode(t, r) {
    const today = new Date().toISOString();
    FLAT.slice(0, r.n).forEach(it => {
      if (isDone(t, it)) return;
      t.done[it.key] = { date: today, perfect: false, mistakes: 0 };
      if (it.type === 'boss') addCode(t, 'C', String(it.stage.id), stageCertTitle(it.stage)); else addCode(t, 'D', it.ref, it.title);
    });
    t.xp = Math.max(t.xp, r.xp);
    FLAG_BADGES.forEach((id, i) => { if (r.f & (1 << i) && !t.badges[id]) { t.badges[id] = today; addCode(t, 'B', String(id).padStart(2, '0'), 'وسام: ' + BADGES.find(b => b.id === id).title); } });
    if (allDone(t) && !t.codes.some(c => c.kind === 'C' && c.ref === '7')) addCode(t, 'C', '7', FINAL.certName);
    checkBadges(t);
  }
  function showTransfer() {
    const code = transferCode(ME), url = SITE_URL + '#c=' + code.replace(/-/g, '');
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const m = modal(`<div class="big-emoji">📲</div><h2 style="margin:4px 0">أكمل من جهاز آخر</h2>
      <p style="margin:4px 0">على الجهاز الآخر اضغط <b>«📥 عندي كود من جهاز آخر»</b>، واكتب اسمك وصفّك كما هنا، ثم هذا الكود:</p>
      <div class="xfer-code ltr">${code}</div>
      <p class="muted" style="margin:6px 0">أو امسح الرمز بكاميرا الهاتف أو الآيباد:</p>
      <div class="qr-box">${qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true, alt: 'رمز نقل التقدّم' })}</div>
      <p class="muted" style="font-size:15px;margin:6px 0">الكود يعمل مع اسمك وصفّك فقط، ويتغيّر كلما تقدّمت.</p>
      <div class="row"><button class="btn" data-copy>📋 نسخ الكود</button><button class="btn ghost" data-x>إغلاق</button></div>`);
    $('[data-x]', m.el).onclick = m.close;
    $('[data-copy]', m.el).onclick = async e => { try { await navigator.clipboard.writeText(code); e.target.textContent = '✅ تم النسخ'; } catch (er) { prompt('انسخ الكود:', code); } };
  }
  function askTransfer(code = '') {
    const grades = [1, 2, 3, 4, 5, 6].map(g => `<option value="${g}" ${g === 5 ? 'selected' : ''}>الصف ${g}</option>`).join('');
    const secs = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">شعبة ${i + 1}</option>`).join('');
    const m = modal(`<div class="big-emoji">📥</div><h2 style="margin:4px 0">عندي كود من جهاز آخر</h2>
      <p style="margin:4px 0">اكتب اسمك وصفّك <b>كما سجّلتهما أول مرة</b>، ثم الكود:</p>
      <div class="row name-row">${nameFields('x')}<select class="field" id="xG">${grades}</select><select class="field" id="xS">${secs}</select></div>
      <input class="field ltr xfer-in" id="xC" inputmode="numeric" autocomplete="off" placeholder="0000-0000-0000-0000" value="${esc(code)}">
      <div class="row" style="margin-top:10px"><button class="btn" data-go>نقل تقدّمي</button><button class="btn ghost" data-x>إلغاء</button></div>`);
    $('[data-x]', m.el).onclick = m.close;
    $('[data-go]', m.el).onclick = async () => {
      const parts = readName('x', m.el), err = nameError(parts); if (err) return toast(err);
      const w = { name: parts.join(' '), grade: +$('#xG', m.el).value, section: +$('#xS', m.el).value };
      const r = readCode($('#xC', m.el).value, w);
      if (!r) return toast('❌ الكود لا يطابق الاسم والصف.<br><small>اكتب اسمك الثلاثي وصفّك وشعبتك تماماً كما سجّلتها أول مرة، وتأكد من أرقام الكود.</small>');
      const same = Object.values(DB.students).find(x => sameName(x, w));
      if (!await confirmBox(`📲 <b>${esc(w.name)}</b> — ${classLabel(w)}<br>${r.n} درساً منجزاً · ⭐ ${r.xp} XP<br><small>${same ? 'سيُضاف إلى تقدّمك على هذا الجهاز.' : 'سيُحفظ على هذا الجهاز.'}</small>`, 'نعم، انقله', 'إلغاء')) return;
      let t = same;
      if (!t) { const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); t = DB.students[id] = { id, name: w.name, grade: w.grade, section: w.section, created: new Date().toISOString(), xp: 0, done: {}, codes: [], badges: {}, heard: {} }; }
      applyCode(t, r); m.close(); save(); track('transfer', 'نقل تقدّم من جهاز آخر'); enter(t);
    };
  }
  function editMyName(confirm, done) {
    const s = ME, sample = () => ({ name: readName('e', m.el).join(' '), grade: s.grade, section: s.section });
    const m = modal(`<h2 style="margin:0 0 6px">${confirm ? '✋ قبل أن نحفظ إنجازك: تأكّد من اسمك' : '✏️ تعديل اسمي'}</h2>
      <p class="muted" style="margin:0 0 10px">هكذا سيظهر اسمك في كل شهاداتك:</p>
      <div class="cert-sample"><div id="ePrev"></div><div class="sample-mark">نموذج</div></div>
      <div class="row name-row" style="margin-top:12px">${nameFields('e', s.name)}</div>
      <p class="warn">⚠️ تأكّد أن اسمك صحيح تماماً: <b>لن تختم الإدارة الشهادة إذا كان الاسم غير صحيح.</b><br>${confirm ? 'بعد هذه الخطوة لا يمكنك تغيير اسمك بنفسك، فقط معلّمك يستطيع.' : 'يمكنك تعديل اسمك حتى تُنهي أول درس، بعدها يُقفل.'}</p>
      <div class="row"><button class="btn ok" data-ok>${confirm ? 'اسمي صحيح ✔ تابِع' : 'حفظ الاسم'}</button>${confirm ? '' : '<button class="btn ghost" data-x>إلغاء</button>'}</div>`, 'wide');
    const draw = () => { $('#ePrev', m.el).innerHTML = certHTML(sample(), STAGES[0], 'C1-XXX-XXXXXX', new Date().toISOString()); };
    draw(); $$('.name-part', m.el).forEach(i => i.oninput = draw);
    if (!confirm) $('[data-x]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = () => {
      const parts = readName('e', m.el), err = nameError(parts);
      if (err) return toast(err);
      const n = { ...sample() };
      if (Object.values(DB.students).some(x => x !== s && sameName(x, n))) return toast('يوجد طالب آخر بنفس الاسم والصف على هذا الجهاز.');
      s.name = parts.join(' '); save(); m.close(); done();
    };
  }
  function finishItem() {
    const s = ME, it = P.it, first = !isDone(s, it);
    if (first && !nameLocked(s)) return editMyName(true, finishItemSave);
    finishItemSave();
  }
  function finishItemSave() {
    const s = ME, it = P.it, first = !isDone(s, it);
    const perfect = P.mistakes === 0;
    let gained = 0, cert = null, finalCert = null;
    if (first) {
      gained = XP[it.type] + (perfect && it.type !== 'boss' ? 5 : 0);
      s.xp += gained;
      s.done[it.key] = { date: new Date().toISOString(), perfect, mistakes: P.mistakes };
      if (it.type === 'boss') cert = addCode(s, 'C', String(it.stage.id), it.stage.certName);
      else addCode(s, 'D', it.ref, it.title);
      if (allDone(s)) finalCert = addCode(s, 'C', '7', FINAL.certName);
      if (cert) track('cert-' + it.stage.id, 'شهادة المرحلة ' + it.stage.id);
      if (finalCert) track('course-complete', 'إتمام المنهج');
    } else {
      cert = it.type === 'boss' ? s.codes.find(c => c.kind === 'C' && c.ref === String(it.stage.id)) : null;
      if (perfect && !s.done[it.key].perfect) s.done[it.key].perfect = true;
    }
    const badges = checkBadges(s, { perfect: perfect && it.type !== 'boss' && first, speed: P.speedWon });
    save();
    play(it.type === 'boss' ? 'win' : 'win'); confetti();
    const title = it.type === 'boss' ? `هزمت ${NAMES[it.stage.villain]}! 🏆` : it.type === 'mission' ? 'أنجزت المهمّة! 🎯' : first ? 'أكملت الدرس! 🎉' : 'أحسنت المراجعة! 👍';
    const m = modal(`
      <div class="m-face">${face('guide')}</div>
      <div class="done-title">${title}</div>
      <p class="muted" style="margin:0">${esc(it.title)} — <span class="ltr">${esc(it.en)}</span></p>
      <div class="stats">${gained ? `<span class="pill">⭐ +${gained} XP</span>` : ''}${perfect ? '<span class="pill">🎯 بدون أخطاء</span>' : `<span class="pill">🔁 ${P.mistakes} أخطاء تعلّمت منها</span>`}</div>
      ${cert ? `<div class="code-box gold"><div class="cd">📜 مبروك! حصلت على ${esc(it.stage.certName)}</div></div>` : ''}
      ${finalCert ? `<div class="code-box gold"><div class="cd">🏆 و${esc(FINAL.certName)}!</div></div>` : ''}
      ${cert && first && SET().formsLink ? `<div class="send-box"><b>📨 أرسل إنجازك لمعلمك</b> ليُسجَّل في سجل المدرسة.<br><button class="btn forms" data-f>📨 أرسل الآن</button></div>` : ''}
      ${badges.map(b => `<div class="code-box badge"><div class="cd">🏅 وسام جديد: ${b.badge.icon} ${b.badge.title}</div><div class="lbl">${b.badge.desc}</div></div>`).join('')}
      <div class="row" style="margin-top:8px">${cert ? '<button class="btn ok" data-c>📜 عرض شهادتي</button>' : ''}<button class="btn" data-h>متابعة ←</button></div>`);
    if (badges.length) setTimeout(() => play('badge'), 900);
    $('[data-h]', m.el).onclick = () => { m.close(); renderHome(); };
    if (cert) $('[data-c]', m.el).onclick = () => { m.close(); renderHome(); showCert(s, it.stage); };
    if ($('[data-f]', m.el)) $('[data-f]', m.el).onclick = e => { sendToTeacher(s, finalCert ? FINAL : it.stage); e.target.textContent = '✅ فُتح النموذج، اضغط «إرسال» فيه'; };
  }

  // ====================== أنواع البطاقات ======================
  const RENDER = {}, CHECK = {}, READY = {}, REVEAL = {};
  // رأس البطاقة: شخصية تتكلم + سؤال
  function head(c) {
    return `${c.who ? `<div class="speaker">${face(c.who, c.mood)}<div class="bubble">${fmt(c.lead || '')}</div></div>` : c.lead ? `<div class="lead">${fmt(c.lead)}</div>` : ''}
      ${c.img ? `<div class="img sm">${c.img}</div>` : ''}
      ${c.q ? `<div class="q">${fmt(c.q)}</div>` : ''}`;
  }
  RENDER.intro = (el, c) => {
    el.innerHTML = `<div class="intro-art">${face(c.who || 'guide', c.mood)}</div>${c.title ? `<h2 class="c-title">${fmt(c.title)}</h2>` : ''}<div class="txt">${fmt(c.text)}</div>${c.note ? `<div class="note">${fmt(c.note)}</div>` : ''}`;
  };
  RENDER.story = (el, c) => {
    el.innerHTML = `${c.title ? `<h2 class="c-title">${fmt(c.title)}</h2>` : ''}<div class="story">${c.panels.map((p, i) => `
      <div class="s-row ${['guide', 'cat'].includes(p.who) ? '' : 'rev'}" style="animation-delay:${i * .5}s">${face(p.who, p.mood)}<div class="bubble"><div class="s-name">${NAMES[p.who]}</div>${fmt(p.text)}</div></div>`).join('')}</div>`;
  };
  RENDER.recap = (el, c) => {
    el.innerHTML = `<div class="intro-art">${face('guide')}</div><h2 class="c-title">ماذا تعلّمت؟</h2>
      <ul class="recap">${c.points.map(p => `<li>🛡️ ${fmt(p)}</li>`).join('')}</ul>
      ${c.joke ? `<div class="joke-box">${face('cat', 'laugh')}<div>😂 ${fmt(c.joke)}</div></div>` : ''}
      ${c.next ? `<div class="note">${fmt('في الدرس القادم: ' + c.next)}</div>` : ''}`;
  };

  // ---- mcq ----
  RENDER.mcq = (el, c) => {
    P.ui.order = c.keep ? c.options.map((_, i) => i) : shuffle(c.options.map((_, i) => i));
    P.answer = c.multi ? [] : null;
    el.innerHTML = head(c) + `${c.multi ? '<div class="muted" style="margin-bottom:8px">✔️ اختر كل الإجابات الصحيحة</div>' : ''}
      <div class="opts ${c.options.length === 2 ? 'two' : ''}">${P.ui.order.map(i => `<button class="opt ${c.multi ? 'multi' : ''}" data-i="${i}">${c.multi ? '<span class="box"></span>' : ''}${fmt(c.options[i])}</button>`).join('')}</div>`;
    $$('.opt', el).forEach(b => b.onclick = e => {
      if (e.target.closest('[data-say]') || P.state === 'locked') return;
      const i = +b.dataset.i; play('tap');
      if (c.multi) { P.answer = P.answer.includes(i) ? P.answer.filter(x => x !== i) : P.answer.concat(i); b.classList.toggle('sel'); }
      else { $$('.opt', el).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); P.answer = i; }
      updateCheck();
    });
  };
  READY.mcq = c => c.multi ? P.answer.length > 0 : P.answer !== null;
  CHECK.mcq = async c => {
    P.state = 'locked';
    if (c.multi) {
      const want = c.a.slice().sort().join(), got = P.answer.slice().sort().join();
      P.answer.forEach(i => $(`.opt[data-i="${i}"]`).classList.add(c.a.includes(i) ? 'right' : 'wrong'));
      return { ok: want === got };
    }
    const ok = P.answer === c.a;
    $(`.opt[data-i="${P.answer}"]`).classList.add(ok ? 'right' : 'wrong');
    return { ok };
  };
  REVEAL.mcq = c => { (c.multi ? c.a : [c.a]).forEach(i => $(`.opt[data-i="${i}"]`).classList.add('right')); };

  // ---- fill ----
  const splitSrc = (src) => src.split(/(\{\{\d+\}\})/);
  const sentence = (c, blankHtml) => `<div class="sentence">${splitSrc(c.src).map(p => { const m = /^\{\{(\d+)\}\}$/.exec(p); return m ? blankHtml(+m[1]) : fmt(p); }).join('')}</div>`;
  RENDER.fill = (el, c) => {
    P.answer = c.a.map(() => null);
    P.ui.tokens = shuffle(c.tokens.map((t, k) => ({ t, k })));
    el.innerHTML = head(c) + sentence(c, i => `<span class="blank" data-b="${i}"></span>`) +
      `<div class="tokens">${P.ui.tokens.map(o => `<button class="tok" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>`;
    $$('.tok', el).forEach(t => t.onclick = () => {
      if (P.state === 'locked') return;
      const i = P.answer.indexOf(null); if (i < 0) return;
      P.answer[i] = +t.dataset.k; drawBlanks(c); play('tap'); updateCheck();
    });
    $$('.blank', el).forEach(b => b.onclick = () => { if (P.state === 'locked') return; P.answer[+b.dataset.b] = null; drawBlanks(c); updateCheck(); });
  };
  function drawBlanks(c) {
    $$('.blank').forEach(b => { const k = P.answer[+b.dataset.b]; b.textContent = k === null ? '' : c.tokens[k]; b.classList.toggle('filled', k !== null); });
    $$('.tok').forEach(t => t.classList.toggle('used', P.answer.includes(+t.dataset.k)));
  }
  READY.fill = () => P.answer.every(v => v !== null);
  CHECK.fill = async c => {
    P.state = 'locked';
    const ok = c.a.every((v, i) => c.tokens[P.answer[i]] === v);
    $$('.blank').forEach(b => { const i = +b.dataset.b; b.classList.add(c.tokens[P.answer[i]] === c.a[i] ? 'b-ok' : 'b-bad'); });
    return { ok };
  };
  REVEAL.fill = c => { $$('.blank').forEach(b => { const i = +b.dataset.b; b.textContent = c.a[i]; b.classList.remove('b-bad'); b.classList.add('b-ok'); }); };

  // ---- type ----
  RENDER.type = (el, c) => {
    el.innerHTML = head(c) + sentence(c, i => `<span class="blank filled typed"><input data-b="${i}" spellcheck="false" autocomplete="off" size="${Math.max(4, c.a[i].length + 1)}" dir="${/[a-z]/i.test(c.a[i]) ? 'ltr' : 'rtl'}"></span>`) + '<p class="muted">⌨️ اكتب الإجابة داخل المربع</p>';
    $$('input', el).forEach(i => { i.oninput = updateCheck; i.onkeydown = e => { if (e.key === 'Enter' && !$('#pBtn').disabled) $('#pBtn').click(); }; });
    setTimeout(() => { const i = $('input', el); i && i.focus(); }, 50);
  };
  READY.type = () => $$('.card input').every(i => i.value.trim());
  CHECK.type = async c => {
    const norm = v => Codes.normName(v).replace(/\s+/g, '');
    const ok = $$('.card input').every(i => norm(i.value) === norm(c.a[+i.dataset.b]));
    $$('.card input').forEach(i => { i.disabled = true; i.parentElement.classList.add(norm(i.value) === norm(c.a[+i.dataset.b]) ? 'b-ok' : 'b-bad'); });
    return { ok };
  };
  REVEAL.type = c => { $$('.card input').forEach(i => { i.value = c.a[+i.dataset.b]; i.parentElement.classList.remove('b-bad'); i.parentElement.classList.add('b-ok'); }); };

  // ---- order ----
  RENDER.order = (el, c) => {
    let pool = shuffle(c.lines.map((_, i) => i));
    if (pool.every((v, i) => v === i) && pool.length > 1) pool.reverse();
    P.ui.pool = pool; P.answer = [];
    el.innerHTML = head(c) + `<div class="zone-label">ترتيبك:</div><div class="order-zone answer" id="oAns"></div>
      <div class="zone-label">اضغط على الخطوات بالترتيب الصحيح:</div><div class="order-zone" id="oPool"></div>`;
    drawOrder(c);
  };
  function drawOrder(c) {
    const line = (i, n) => `<button class="oline" data-i="${i}">${n ? `<span class="num">${n}</span>` : ''}${fmt(c.lines[i])}</button>`;
    $('#oAns').innerHTML = P.answer.map((i, k) => line(i, k + 1)).join('') || '<div class="muted" style="text-align:center">…</div>';
    $('#oPool').innerHTML = P.ui.pool.filter(i => !P.answer.includes(i)).map(i => line(i)).join('') || '<div class="muted" style="text-align:center">✓</div>';
    $$('#oPool .oline').forEach(b => b.onclick = () => { if (P.state === 'locked') return; P.answer.push(+b.dataset.i); play('tap'); drawOrder(c); updateCheck(); });
    $$('#oAns .oline').forEach(b => b.onclick = () => { if (P.state === 'locked') return; P.answer = P.answer.filter(x => x !== +b.dataset.i); drawOrder(c); updateCheck(); });
  }
  READY.order = c => P.answer.length === c.lines.length;
  CHECK.order = async c => { P.state = 'locked'; return { ok: P.answer.every((v, i) => c.lines[v] === c.lines[i]) }; };
  REVEAL.order = c => { P.answer = c.lines.map((_, i) => i); drawOrder(c); $('#oAns').classList.add('revealed'); };

  // ---- sort: فرز البطاقات (آمن / خطر) — مع تحدّي الوقت اختيارياً ----
  RENDER.sort = (el, c) => {
    const bins = c.bins || [{ label: 'آمن', icon: '✅' }, { label: 'خطر', icon: '⛔' }];
    P.ui.deck = shuffle(c.items.map((x, i) => i)); P.ui.right = 0; P.ui.firstTry = 0; P.ui.tried = {}; P.cardMist = 0;
    el.innerHTML = head(c) + `
      ${c.time ? `<div class="timer"><span id="tLeft">${c.time}</span> ⏱️<div class="t-bar"><i id="tBar"></i></div></div>` : ''}
      <div class="sort-wrap"><button class="bin b0" data-bin="0"><span>${bins[0].icon}</span>${bins[0].label}<em id="bc0">0</em></button>
      <div class="deck" id="deck"></div>
      <button class="bin b1" data-bin="1"><span>${bins[1].icon}</span>${bins[1].label}<em id="bc1">0</em></button></div>
      <div class="sort-left muted" id="sLeft"></div>`;
    P.ui.cnt = [0, 0];
    drawDeck(c);
    $$('.bin', el).forEach(b => b.onclick = () => sortPick(c, +b.dataset.bin));
    if (c.time) {
      P.ui.t = c.time;
      P.timer = setInterval(() => {
        P.ui.t--; const tl = $('#tLeft'); if (!tl) return clearInterval(P.timer);
        tl.textContent = P.ui.t; $('#tBar').style.width = (P.ui.t / c.time * 100) + '%';
        if (P.ui.t <= 5 && P.ui.t > 0) play('tick');
        if (P.ui.t <= 0) { clearInterval(P.timer); P.state = 'locked'; result(false, `⏰ انتهى الوقت! صنّفت ${P.ui.right} من ${c.items.length}. أسرع قليلاً!`); }
      }, 1000);
    }
  };
  function drawDeck(c) {
    const d = $('#deck'); if (!d) return;
    if (!P.ui.deck.length) { d.innerHTML = '<div class="deck-done">🎉</div>'; return; }
    const it = c.items[P.ui.deck[0]];
    d.innerHTML = `<div class="scard pop-in">${it[2] ? `<div class="sc-ic">${it[2]}</div>` : ''}<div>${fmt(it[0])}</div></div>`;
    $('#sLeft').textContent = `متبقّي: ${P.ui.deck.length} بطاقات`;
  }
  function sortPick(c, bin) {
    if (P.state === 'locked' || !P.ui.deck.length) return;
    const i = P.ui.deck[0], it = c.items[i], card = $('.scard');
    if (it[1] === bin) {
      play('whoosh'); P.ui.right++; if (!P.ui.tried[i]) P.ui.firstTry++;
      P.ui.cnt[bin]++; $('#bc' + bin).textContent = P.ui.cnt[bin];
      card.classList.add(bin ? 'fly-r' : 'fly-l'); P.ui.deck.shift();
      setTimeout(() => { drawDeck(c); if (!P.ui.deck.length) sortDone(c); }, 260);
    } else {
      play('wrong'); P.ui.tried[i] = 1; P.cardMist++; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      const why = it[3] ? fmt(it[3]) : (bin ? 'هذه آمنة في الحقيقة 🙂' : 'انتبه! هذه خطر ⛔');
      $('#fb').innerHTML = `<span class="warn">${why}</span>`;
      P.ui.deck.push(P.ui.deck.shift()); setTimeout(() => drawDeck(c), 350);
    }
  }
  function sortDone(c) {
    clearInterval(P.timer); P.state = 'locked';
    const msg = `صنّفت ${P.ui.firstTry} من ${c.items.length} من أول محاولة${c.time ? ` وبقي ${P.ui.t} ثانية ⚡` : ''}`;
    if (c.time) P.speedWon = true;
    const ok = P.it.type === 'boss' ? P.cardMist <= 1 : true;
    if (P.cardMist && P.it.type !== 'boss') { const idx = P.queue[P.pos]; if (!P.wrongCards[idx]) { P.wrongCards[idx] = 1; P.mistakes++; } }
    result(ok, msg);
  }

  // ---- meter: مقياس قوة كلمة السر ----
  const COMMON = ['123456', '12345678', '123456789', 'password', 'qwerty', '111111', 'abc123', '000000', 'iloveyou', 'bahrain', '1234', 'admin', 'football', 'messi', 'ronaldo', 'minecraft', 'fortnite', 'roblox'];
  function strength(pw, name) {
    const p = pw.trim(), low = p.toLowerCase();
    if (!p) return { lv: 0, why: [] };
    const why = [];
    let sc = 0;
    if (p.length >= 8) sc++; else why.push('أطول (8 حروف على الأقل)');
    if (p.length >= 12) sc++; else if (p.length >= 8) why.push('أطول من 12 حرفاً أفضل');
    if (/[0-9]/.test(p) && /[^0-9]/.test(p)) sc++; else why.push('أضف أرقاماً مع الحروف');
    if (/[^A-Za-z0-9؀-ۿ\s]/.test(p)) sc++; else why.push('أضف رمزاً مثل ! أو @ أو #');
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) sc++; else why.push('امزج حروفاً كبيرة وصغيرة A a');
    let bad = '';
    if (COMMON.some(w => low.includes(w))) bad = 'فيها كلمة مشهورة يعرفها الثعلب!';
    else if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/.test(low) && p.length < 12) bad = 'فيها تسلسل سهل مثل 1234';
    else if (/(.)\1\1/.test(p)) bad = 'فيها حرف مكرّر كثيراً';
    else if (name && name.split(' ').some(n => n.length > 2 && Codes.normName(p).includes(Codes.normName(n)))) bad = 'فيها اسمك! الثعلب يجرّبه أولاً';
    if (bad) { sc = Math.min(sc, 1); why.unshift(bad); }
    return { lv: Math.min(5, sc), why };
  }
  const LV = [['', '#ddd'], ['ضعيفة جداً 😱', '#e5484d'], ['ضعيفة 😟', '#f76b15'], ['متوسطة 😐', '#ffb300'], ['قوية 💪', '#46a758'], ['قوية جداً 🛡️', '#1f9d55']];
  const FOXTIME = ['', 'أقل من ثانية!', 'بضع دقائق', 'بضعة أيام', 'مئات السنين', 'ملايين السنين!'];
  RENDER.meter = (el, c) => {
    const target = c.target || 4;
    el.innerHTML = head(c) + `<div class="meter-box">
      <div class="m-warn">⚠️ للتدريب فقط — <b>لا تكتب كلمة سرك الحقيقية!</b></div>
      <input class="field pw" id="pw" dir="ltr" autocomplete="off" spellcheck="false" placeholder="اكتب كلمة سر تجريبية…">
      <div class="m-bar">${[1, 2, 3, 4, 5].map(i => `<i data-l="${i}"></i>`).join('')}</div>
      <div class="m-row"><b id="mLabel">—</b><span class="fox-est">${face('fox')}<span>الثعلب يخمّنها في: <b id="mFox">—</b></span></span></div>
      <ul class="m-tips" id="mTips"></ul>
      <div class="muted">🎯 الهدف: الوصول إلى <b>${LV[target][0]}</b></div></div>`;
    const inp = $('#pw', el);
    inp.oninput = () => {
      const r = strength(inp.value, ME ? ME.name : '');
      $$('.m-bar i', el).forEach(i => i.style.background = +i.dataset.l <= r.lv ? LV[r.lv][1] : '#e9e4f7');
      $('#mLabel', el).textContent = LV[r.lv][0] || '—'; $('#mLabel', el).style.color = LV[r.lv][1];
      $('#mFox', el).textContent = FOXTIME[r.lv] || '—';
      $('#mTips', el).innerHTML = r.why.slice(0, 3).map(w => `<li>💡 ${w}</li>`).join('');
      if (r.lv >= target && P.mode === 'wait') { P.state = 'locked'; inp.readOnly = true; result(true, `الثعلب خمّن سيحتاج ${FOXTIME[r.lv]} ليخمّنها 🦊😵`); }
    };
    setTimeout(() => inp.focus(), 50);
  };

  // ---- hotspot: اكتشف علامات الخطر في رسالة / منشور ----
  RENDER.hotspot = (el, c) => {
    P.ui.found = {}; P.cardMist = 0;
    const need = Object.keys(c.spots).length;
    const part = p => typeof p === 'string' ? fmt(p) : `<span class="hs ${p.s ? 'sus' : 'dec'}" data-s="${p.s || ''}">${fmt(p.text)}</span>`;
    const body = c.body.map(part).join('');
    const frame = c.kind === 'email'
      ? `<div class="mock email"><div class="m-top">📧 البريد الوارد</div><div class="m-head"><div><b>من:</b> ${part(c.from)}</div><div><b>الموضوع:</b> ${part(c.subject)}</div></div><div class="m-body">${body}</div></div>`
      : c.kind === 'post'
      ? `<div class="mock post"><div class="m-top">${c.app || '📷 منشور'}</div><div class="p-pic">${c.pic || '🖼️'}</div><div class="m-body">${body}</div></div>`
      : `<div class="mock phone"><div class="m-top">${c.app || '💬 رسالة نصية'}</div><div class="m-from">${part(c.from)}</div><div class="sms">${body}</div></div>`;
    el.innerHTML = head(c) + `<div class="hs-wrap">${frame}<div class="hs-side"><div class="found">🔍 وجدت <b id="hsN">0</b> من ${need}</div><ul id="hsList" class="hs-list"></ul></div></div>`;
    $$('.hs', el).forEach(h => h.onclick = e => {
      if (e.target.closest('[data-say]') || P.state === 'locked') return;
      const s = h.dataset.s;
      if (s) {
        if (P.ui.found[s]) return;
        P.ui.found[s] = 1; h.classList.add('got'); play('correct');
        $('#hsList').innerHTML += `<li>🚩 ${fmt(c.spots[s])}</li>`; $('#hsN').textContent = Object.keys(P.ui.found).length;
        if (Object.keys(P.ui.found).length === need) {
          P.state = 'locked';
          if (P.cardMist && P.it.type !== 'boss') { const idx = P.queue[P.pos]; if (!P.wrongCards[idx]) { P.wrongCards[idx] = 1; P.mistakes++; } }
          result(P.it.type === 'boss' ? P.cardMist <= 1 : true, 'اكتشفت كل علامات الخطر! 🕵️');
        }
      } else {
        play('wrong'); P.cardMist++; h.classList.remove('nope'); void h.offsetWidth; h.classList.add('nope');
        $('#fb').innerHTML = '<span class="warn">هذا الجزء طبيعي ولا خطر فيه 🙂 ابحث عن غيره!</span>';
      }
    });
  };

  // ---- chat: محاكي محادثة بخيارات ----
  RENDER.chat = (el, c) => {
    P.ui.step = 0; P.cardMist = 0;
    el.innerHTML = head(c) + `<div class="mock chat"><div class="m-top">${c.app || '🎮 محادثة اللعبة'} · ${face(c.contact.who, c.contact.mood)} <b>${esc(c.contact.name)}</b></div>
      <div class="chat-log" id="clog"></div><div class="chat-opts" id="copts"></div></div>`;
    chatStep(c);
  };
  function chatStep(c) {
    const st = c.steps[P.ui.step], log = $('#clog');
    log.insertAdjacentHTML('beforeend', `<div class="msg them pop-in">${fmt(st.them)}</div>`);
    log.scrollTop = log.scrollHeight; play('pop');
    $('#copts').innerHTML = shuffle(st.options.map((o, i) => i)).map(i => `<button class="opt copt" data-i="${i}">${fmt(st.options[i].text)}</button>`).join('');
    $$('#copts .copt').forEach(b => b.onclick = e => {
      if (e.target.closest('[data-say]') || P.state === 'locked') return;
      const o = st.options[+b.dataset.i];
      if (o.ok) {
        play('tap'); log.insertAdjacentHTML('beforeend', `<div class="msg me pop-in">${fmt(o.text)}</div>`);
        if (o.why) log.insertAdjacentHTML('beforeend', `<div class="msg guide pop-in">🤖 درع: ${fmt(o.why)}</div>`);
        log.scrollTop = log.scrollHeight;
        P.ui.step++;
        if (P.ui.step >= c.steps.length) {
          $('#copts').innerHTML = c.end ? `<div class="msg guide">🤖 ${fmt(c.end)}</div>` : '';
          P.state = 'locked';
          if (P.cardMist && P.it.type !== 'boss') { const idx = P.queue[P.pos]; if (!P.wrongCards[idx]) { P.wrongCards[idx] = 1; P.mistakes++; } }
          return result(P.it.type === 'boss' ? P.cardMist <= 1 : true, 'تصرّفت مثل حارس حقيقي! 🛡️');
        }
        setTimeout(() => chatStep(c), 700);
      } else {
        play('wrong'); P.cardMist++; b.classList.add('wrong'); b.disabled = true;
        $('#fb').innerHTML = `<span class="warn">🤖 ${fmt(o.why || 'هذا الرد غير آمن، جرّب غيره!')}</span>`;
      }
    });
  }

  // ====================== الإنجازات والقاموس ======================
  function showAchievements() {
    const s = ME;
    const certs = s.codes.filter(c => c.kind === 'C'), lessons = s.codes.filter(c => c.kind === 'D');
    const stageOf = ref => ref === '7' ? FINAL : STAGES.find(x => String(x.id) === ref);
    const m = modal(`
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">🎖️ إنجازاتي — ${esc(s.name)}</h2><button class="iconbtn" data-x>✖</button></div>
      <div class="stats"><span class="pill">⭐ ${s.xp} XP</span><span class="pill">📘 ${lessons.length} دروس ومهام</span><span class="pill">🏅 ${Object.keys(s.badges).length} أوسمة</span><span class="pill">📜 ${certs.length} شهادات</span></div>
      <h3 class="sec">📜 شهاداتي</h3>
      ${certs.length ? `<div class="badges">${certs.map(c => { const st = stageOf(c.ref); return `<div class="bdg"><div class="i">${st.icon}</div><div class="t">${esc(st.certName)}</div><button class="btn sm" data-cert="${st.id}" style="margin-top:6px">عرض</button></div>`; }).join('')}</div>` : '<p class="muted">اهزم شرير أي مرحلة لتحصل على شهادتك الأولى!</p>'}
      <h3 class="sec">🏅 الأوسمة</h3>
      <div class="badges">${BADGES.map(b => `<div class="bdg ${s.badges[b.id] ? '' : 'off'}"><div class="i">${b.icon}</div><div class="t">${b.title}</div><div class="d">${b.desc}</div></div>`).join('')}</div>
      <h3 class="sec">👾 الأشرار الذين هزمتهم</h3>
      <div class="badges">${STAGES.map(st => { const w = stageDone(s, st); return `<div class="bdg ${w ? '' : 'off'}"><div class="vi">${ART.CHARS[st.villain](st.villain === 'cloud' && w ? 'happy' : undefined)}</div><div class="t">${NAMES[st.villain]}</div><div class="d">${w ? 'هُزم ✔' : '???'}</div></div>`; }).join('')}</div>
    `, 'wide');
    $('[data-x]', m.el).onclick = m.close;
    $$('[data-cert]', m.el).forEach(b => b.onclick = () => showCert(s, stageOf(b.dataset.cert)));
  }
  function showDictionary() {
    const heard = ME.heard || {};
    const m = modal(`<div class="row" style="justify-content:space-between"><h2 style="margin:0">📖 قاموسي — اضغط لتسمع 🔊</h2><button class="iconbtn" data-x>✖</button></div>
      <p class="muted">سمعت ${Object.keys(heard).length} من ${Object.keys(TERMS).length} مصطلحاً. استمع إلى 10 مصطلحات لتحصل على وسام 🎧 المستمع الذكي!</p>
      <div class="dict">${Object.entries(TERMS).map(([en, ar]) => `<div class="dterm">${fmt('[[' + en + ']]')}<span>${esc(ar)}</span></div>`).join('')}</div>`, 'wide');
    $('[data-x]', m.el).onclick = m.close;
  }

  // ====================== الشهادة ======================
  function certHTML(s, st, code, date) {
    const S = SET();
    const what = st.final ? `أتمّ بنجاح <span class="stage-name">جميع المراحل الست</span> وأصبح <span class="stage-name">حارساً رقمياً محترفاً</span>`
      : `أتمّ بنجاح <span class="stage-name">المرحلة ${st.id}: ${esc(st.title)}</span> <span class="ltr">(${esc(st.en)})</span>`;
    return `<div class="cert" style="--cc:${st.color}">
        <div class="cert-corner" style="top:-8%;right:-6%"></div><div class="cert-corner" style="bottom:-8%;left:-6%"></div>
        <div class="cert-frame"></div>
        <div class="cert-guide">${ART.guide()}</div>
        <div class="cert-in">
          <div class="cert-head"><img class="letterhead" src="${LETTERHEAD || 'letterhead.png'}" alt=""><div class="credit">فكرة وتطوير: أ. جهاد الدمستاني</div></div>
          <div><div class="medal">${st.icon}🛡️</div><div class="ttl">${esc(st.certName)}</div><div class="ttl-en">${st.final ? 'PRO DIGITAL GUARDIAN' : 'CERTIFICATE OF COMPLETION'}</div></div>
          <div class="line">يسرّنا أن نشهد بأن الطالب<br><span class="stu-name">${esc(s.name)}</span><br>
            من ${classLabel(s)} قد ${what}<br>
            ضمن برنامج <b>حُرّاس أبوصيبع الرقميّون</b> للاستخدام الآمن للتكنولوجيا، بتاريخ ${fmtDate(date)}</div>
          <div class="sig-row">
            <div class="sig"><div class="muted">${esc(S.teacherTitle)}</div><div class="s">${esc(S.teacher)}</div></div>
            <div class="cert-code"><div class="muted" style="font-size:.9em">رمز التحقق من الشهادة</div><div class="cd">${code}</div></div>
            <div class="sig"><div class="muted">مدير المدرسة</div><div class="s">${esc(S.principal)}</div></div>
          </div>
        </div>
      </div>`;
  }
  const certTitle = st => st.certName;
  // يستبدل الكلمات NAME وCLASS وSTAGE وCODE وAPP في الرابط المعبّأ مسبقاً بقيم الطالب
  function formsURL(link, vals) {
    try {
      const u = new URL(link.trim());
      if (u.protocol !== 'https:' || !/^(forms\.office\.com|forms\.microsoft\.com|forms\.cloud\.microsoft)$/.test(u.hostname)) return '';
      for (const [k, v] of [...u.searchParams]) if (vals[v.trim().toUpperCase()] !== undefined) u.searchParams.set(k, vals[v.trim().toUpperCase()]);
      return u.toString().replace(/\+/g, '%20'); // مسافة = %20 (إشارة + الحقيقية تُرمَّز %2B)
    } catch (e) { return ''; }
  }
  // عدّاد زيارات مجهول (GoatCounter في نسخة الموقع فقط): أحداث بلا أسماء ولا بيانات شخصية
  const track = (path, title) => { if (ME && ME.demo) return; try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true }); } catch (e) {} };
  // يفتح نموذج Forms معبّأً بإنجاز الطالب: الشهادة وكودها وعدد الدروس والنقاط
  function sendToTeacher(s, st) {
    const c = s.codes.find(x => x.kind === 'C' && x.ref === String(st.id));
    const u = c && formsURL(SET().formsLink, { NAME: s.name, CLASS: classLabel(s), STAGE: certTitle(st), CODE: c.code, APP: APP_NAME, LESSONS: String(Object.keys(s.done).length), XP: String(s.xp) });
    if (!u) return toast('❌ رابط النموذج غير صحيح، أخبر معلّمك.');
    NATIVE ? NATIVE.openURL(u) : window.open(u, '_blank');
  }
  function showCert(s, st) {
    const c = s.codes.find(x => x.kind === 'C' && x.ref === String(st.id)); if (!c) return;
    const S = SET();
    const v = $('#certView');
    v.innerHTML = `<div class="modal">
      ${certHTML(s, st, c.code, c.date)}
      <div class="cert-actions">${S.formsLink ? `<button class="btn forms" id="cForms">📨 أرسل شهادتي للمعلم</button>` : ''}${S.teacherEmail ? `<button class="btn teams" id="cTeams">📤 أرسلها لمعلّمي في Teams</button>` : ''}<button class="btn ok" id="cPdf">💾 حفظ PDF</button><button class="btn" id="cPrint">🖨️ طباعة</button><button class="btn ghost" id="cClose">إغلاق</button></div>
    </div>`;
    v.classList.remove('hidden');
    $('#cClose').onclick = () => v.classList.add('hidden');
    $('#cPrint').onclick = () => NATIVE ? NATIVE.print() : window.print();
    $('#cPdf').onclick = async () => {
      if (!NATIVE) return window.print();
      const f = await NATIVE.savePDF(`${st.certName} - ${s.name}`);
      if (f) toast('✅ تم حفظ الشهادة:<br><span class="ltr" style="font-size:14px">' + esc(f) + '</span>');
    };
    if (S.formsLink) $('#cForms').onclick = () => sendToTeacher(s, st);
    if (S.teacherEmail) $('#cTeams').onclick = async () => {
      const msg = `السلام عليكم ${S.teacher}،\nأرسل لك شهادتي في تطبيق «${APP_NAME}»:\n${st.certName}\nالاسم: ${s.name} — ${classLabel(s)}\nرمز التحقق: ${c.code}`;
      const f = NATIVE ? await NATIVE.shareTeams(`${st.certName} - ${s.name}`, S.teacherEmail, msg) : (window.open('https://teams.microsoft.com/l/chat/0/0?users=' + encodeURIComponent(S.teacherEmail) + '&message=' + encodeURIComponent(msg)), '');
      v.classList.add('hidden');
      modal(`<div class="big-emoji">📤</div><h2>خطوة أخيرة!</h2>
        <p style="font-size:19px">فتحنا لك محادثة Teams مع <b>${esc(S.teacher)}</b> وفيها رسالة جاهزة.<br>
        ${f ? 'اسحب ملف الشهادة من المجلد الذي فُتح وأفلته في المحادثة' : 'احفظ الشهادة أولاً بزر «حفظ PDF»، ثم أرفقها في المحادثة بزر المرفقات 📎'}، ثم اضغط <b>إرسال</b>.</p>
        <p class="muted ltr" style="font-size:14px">${esc(f)}</p><button class="btn" data-x>تم 👍</button>`).el.querySelector('[data-x]').onclick = e => e.target.closest('.modal-bg').remove();
    };
  }

  // ====================== لوحة المعلم ======================
  let FAILS = 0, LOCK_UNTIL = 0;
  function teacherLogin() {
    if (!hasPass()) return setupPass(false);
    const m = modal(`<div class="big-emoji">🔒</div><h2>لوحة المعلم</h2><p class="muted">أدخل كلمة المرور</p>
      <input type="password" class="field ltr" id="pin" style="text-align:center;font-size:22px;width:260px" autofocus>
      <p class="warn" id="pMsg"></p>
      <div class="row" style="margin-top:6px"><button class="btn" data-ok>دخول</button><button class="btn ghost" data-x>إلغاء</button></div>
      <p><a href="#" id="forgot" class="muted">نسيت كلمة المرور؟</a></p>`);
    const msg = t => { $('#pMsg', m.el).innerHTML = t; };
    const go = async () => {
      const wait = Math.ceil((LOCK_UNTIL - Date.now()) / 1000);
      if (wait > 0) return msg(`⏳ محاولات كثيرة خاطئة. انتظر ${wait} ثانية.`);
      const btn = $('[data-ok]', m.el); btn.disabled = true;
      const ok = await checkPass($('#pin', m.el).value); btn.disabled = false;
      if (ok) { FAILS = 0; m.close(); return teacherPanel(); }
      play('wrong'); $('#pin', m.el).value = ''; FAILS++;
      if (FAILS >= 5) { LOCK_UNTIL = Date.now() + 60000 * 2 ** Math.min(FAILS - 5, 4); msg(`⏳ محاولات كثيرة خاطئة. اللوحة مقفلة ${Math.round((LOCK_UNTIL - Date.now()) / 60000)} دقيقة.`); }
      else msg(`كلمة مرور خاطئة (${FAILS} من 5)`);
    };
    $('[data-ok]', m.el).onclick = go; $('[data-x]', m.el).onclick = m.close;
    $('#pin', m.el).onkeydown = e => { if (e.key === 'Enter') go(); };
    $('#forgot', m.el).onclick = e => { e.preventDefault(); m.close(); setupPass(true); };
    setTimeout(() => $('#pin', m.el).focus(), 50);
  }
  // إنشاء كلمة مرور (أول مرة) أو استعادتها — يحتاج رمز الاسترداد
  function setupPass(forgot) {
    const m = modal(`<div class="big-emoji">🔑</div><h2>${forgot ? 'استعادة كلمة المرور' : 'إنشاء كلمة مرور للوحة المعلم'}</h2>
      <p class="muted">${forgot ? 'أدخل رمز الاسترداد ثم اختر كلمة مرور جديدة.' : 'لم تُضبط كلمة مرور على هذه النسخة بعد. أدخل <b>رمز الاسترداد</b> الذي لدى المعلم المسؤول، ثم اختر كلمة مرور.'}</p>
      <div class="editor-form" style="max-width:360px;margin:0 auto">
        <label>رمز الاسترداد<input class="field ltr" id="rKey" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"></label>
        <label>كلمة المرور الجديدة<input class="field ltr" id="rP1" type="password"></label>
        <label>تأكيد كلمة المرور<input class="field ltr" id="rP2" type="password"></label>
      </div>
      <p class="muted" style="font-size:14px">8 خانات على الأقل، فيها حروف وأرقام.</p><p class="warn" id="rMsg"></p>
      <div class="row"><button class="btn" data-ok>حفظ</button><button class="btn ghost" data-x>إلغاء</button></div>`);
    $('[data-x]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async () => {
      const msg = t => { $('#rMsg', m.el).innerHTML = t; };
      const wait = Math.ceil((LOCK_UNTIL - Date.now()) / 1000);
      if (wait > 0) return msg(`⏳ انتظر ${wait} ثانية.`);
      const p1 = $('#rP1', m.el).value, p2 = $('#rP2', m.el).value;
      if (passError(p1)) return msg(passError(p1));
      if (p1 !== p2) return msg('كلمتا المرور غير متطابقتين.');
      if (!await checkRecovery($('#rKey', m.el).value)) { FAILS++; if (FAILS >= 5) LOCK_UNTIL = Date.now() + 60000 * 2 ** Math.min(FAILS - 5, 4); play('wrong'); return msg('رمز الاسترداد غير صحيح.'); }
      FAILS = 0; await setPass(p1); m.close(); teacherPanel(); toast('✅ تم حفظ كلمة المرور. احفظها في مكان آمن.');
    };
  }
  function teacherPanel(tab = 'verify', arg) {
    $('#modalRoot').innerHTML = '';
    const m = modal(`<div class="row" style="justify-content:space-between"><h2 style="margin:0">👨‍🏫 لوحة المعلم</h2><button class="iconbtn" data-x>✖</button></div>
      ${PENDING ? `<div class="warn-box">⚠️ وُجد ملف تعديلات غير موثّق (من نسخة سابقة أو تم العبث به)، ولم يُطبَّق. <button class="btn sm" id="adopt">اعتماده</button> <button class="btn ghost sm" id="drop">تجاهله</button></div>` : ''}
      ${DB.settings.tampered ? `<p class="warn">⚠️ تنبيه: تم اكتشاف تعديل يدوي على ملف البيانات بتاريخ ${fmtDate(DB.settings.tampered)}. الأكواد تبقى قابلة للتحقق، لكن راجع تقدّم الطلبة.</p>` : ''}
      <div class="tabs">${[['verify', '✅ التحقق من كود'], ['students', '👥 الطلبة'], ['lessons', '📚 الدروس والأسئلة'], ['data', '📤 تصدير / استيراد'], ['settings', '⚙️ الإعدادات والشهادة']].map(([k, t]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>
      <div id="tBody"></div>`, 'wide');
    $('[data-x]', m.el).onclick = () => { m.close(); };
    $$('[data-tab]', m.el).forEach(b => b.onclick = () => teacherPanel(b.dataset.tab));
    TAB[tab]($('#tBody', m.el), arg);
    if (PENDING) {
      $('#adopt', m.el).onclick = async () => { const pass = CUSTOM.settings.pass; CUSTOM = PENDING.data; CUSTOM.settings.pass = pass; LETTERHEAD = PENDING.letterhead; PENDING = null;
        for (const it of FLAT) it.cards = CUSTOM.lessons[it.key] || it.orig; await saveCustom(); teacherPanel(tab); };
      $('#drop', m.el).onclick = async () => { PENDING = null; await saveCustom(); teacherPanel(tab); };
    }
  }

  const kindLabel = p => p.kind === 'C' ? `📜 ${(p.ref === '7' ? FINAL : STAGES.find(s => String(s.id) === p.ref) || {}).certName || '؟'}`
    : p.kind === 'B' ? `🏅 وسام: ${(BADGES.find(b => b.id === +p.ref) || {}).title || '؟'}` : `📘 إكمال: ${itemTitle(p.ref)}`;
  const TAB = {};
  TAB.verify = el => {
    const grades = [1, 2, 3, 4, 5, 6].map(g => `<option>${g}</option>`).join('');
    const secs = Array.from({ length: 10 }, (_, i) => `<option>${i + 1}</option>`).join('');
    el.innerHTML = `<p class="muted">أدخل الكود الموجود أسفل الشهادة. إذا كان الطالب مسجّلاً على هذا الجهاز سيظهر مباشرة، وإلا أدخل اسمه وصفّه كما في الشهادة للتحقق.</p>
      <div class="form-grid">
        <label style="grid-column:1/-1">الكود<input class="field ltr" id="vCode" placeholder="C1-XXX-XXXXXX" style="font-family:var(--mono);font-size:22px;text-align:center"></label>
        <label>اسم الطالب<input class="field" id="vName"></label>
        <div class="row" style="justify-content:flex-start"><label>الصف<select class="field" id="vG">${grades}</select></label><label>الشعبة<select class="field" id="vS">${secs}</select></label></div>
      </div>
      <div style="margin-top:12px"><button class="btn" id="vGo">تحقّق 🔍</button></div><div id="vRes"></div>`;
    $('#vGo').onclick = () => {
      const code = $('#vCode').value, p = Codes.parse(code), res = $('#vRes');
      if (!p) { res.innerHTML = `<div class="verify-res bad">❌ صيغة الكود غير صحيحة. الشكل الصحيح مثل: <span class="ltr">C1-2B4-XPD6QN</span></div>`; return; }
      const local = Object.values(DB.students).find(s => s.codes.some(c => c.code === p.code));
      let who = null;
      if (local) who = local;
      else if ($('#vName').value.trim()) who = { name: $('#vName').value, grade: +$('#vG').value, section: +$('#vS').value };
      if (!who) { res.innerHTML = `<div class="verify-res bad">هذا الكود غير موجود على هذا الجهاز. أدخل <b>اسم الطالب وصفّه</b> للتحقق منه.</div>`; return; }
      const v = Codes.verify(code, who);
      res.innerHTML = v.ok
        ? `<div class="verify-res ok">✅ <b>الكود صحيح وأصلي</b><br>الطالب: <b>${esc(who.name)}</b> — ${classLabel(who)}<br>الإنجاز: ${kindLabel(p)}<br>التاريخ: ${fmtDate(p.date)}${local ? '<br><span class="muted">(مسجّل على هذا الجهاز)</span>' : ''}</div>`
        : `<div class="verify-res bad">❌ <b>الكود غير صحيح</b> لهذا الطالب.<br><span class="muted">تأكد من كتابة الاسم كما في الشهادة تماماً، ومن الصف والشعبة.</span></div>`;
    };
  };
  TAB.students = el => {
    const list = Object.values(DB.students).sort((a, b) => a.grade - b.grade || a.section - b.section || a.name.localeCompare(b.name, 'ar'));
    const total = FLAT.length;
    const classes = [...new Set(list.filter(s => !s.demo).map(s => s.grade + '/' + s.section))];
    const demoBar = `<div class="row" style="justify-content:flex-start;margin-bottom:10px"><b>🧪 طالب تجريبي للعرض</b> (لا يظهر للطلبة ولا يدخل في الإحصائيات):<button class="btn sm" data-demo="open">مفتوح بالكامل</button><button class="btn sm" data-demo="full">مكتمل بكل الشهادات</button></div>`;
    el.innerHTML = demoBar + (list.length ? `<p class="muted">عدد الطلبة على هذا الجهاز: ${list.filter(s => !s.demo).length}</p>
      <div class="row" style="justify-content:flex-start;margin-bottom:10px"><b>🖨️ بطاقات النقل</b> (كود وQR لكل طالب ليكمل في البيت):
        <select class="field" id="cdC">${classes.map(c => `<option>${c}</option>`).join('')}</select><button class="btn sm" id="cardsBtn">عرض البطاقات</button></div><div style="max-height:56vh;overflow:auto"><table class="codes-table">
      <tr><th>الاسم</th><th>الصف</th><th>XP</th><th>التقدّم</th><th>الأوسمة</th><th>الشهادات</th><th></th></tr>
      ${list.map(s => { const d = FLAT.filter(it => isDone(s, it)).length; return `<tr><td><b style="color:var(--ink)">${esc(s.name)}</b>${s.demo ? ' <span class="pill sm">🧪 تجريبي</span>' : ''}</td><td>${s.grade}/${s.section}</td><td>${s.xp}</td><td>${d}/${total} (${Math.round(d / total * 100)}%)</td><td>${Object.keys(s.badges).length}</td><td>${s.codes.filter(c => c.kind === 'C').map(c => c.ref === '7' ? '🏆' : 'م' + c.ref).join('، ') || '—'}</td>
        <td>${s.demo ? `<button class="btn sm" data-in="${s.id}">▶️ دخول</button> ` : ''}<button class="btn ghost sm" data-v="${s.id}">الشهادات</button> <button class="btn ghost sm" data-n="${s.id}">✏️ الاسم</button> <button class="btn bad sm" data-d="${s.id}">حذف</button></td></tr>`; }).join('')}</table></div>` : '<p class="muted">لا يوجد طلبة بعد.</p>');
    $$('[data-demo]', el).forEach(b => b.onclick = () => makeDemo(b.dataset.demo));
    $$('[data-in]', el).forEach(b => b.onclick = () => { $('#modalRoot').innerHTML = ''; enter(DB.students[b.dataset.in]); });
    if ($('#cardsBtn', el)) $('#cardsBtn', el).onclick = () => {
      const kids = list.filter(s => !s.demo && s.grade + '/' + s.section === $('#cdC', el).value);
      const card = s => { const code = transferCode(s), qr = qrcode(0, 'M'); qr.addData(SITE_URL + '#c=' + code.replace(/-/g, '')); qr.make();
        return `<div class="xcard"><div class="xc-app">${APP_NAME}</div><div class="xc-name">${esc(s.name)}</div><div class="xc-cls">${classLabel(s)}</div>
          <div class="xc-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: 'رمز نقل التقدّم' })}</div><div class="xc-code ltr">${code}</div>
          <div class="xc-how">امسح الرمز بالكاميرا، أو افتح<br><b class="ltr" style="white-space:nowrap">${SITE_URL.replace('https://', '')}</b><br>واضغط «📥 عندي كود من جهاز آخر»</div></div>`; };
      const pages = []; for (let i = 0; i < kids.length; i += 8) pages.push(`<div class="xpage">${kids.slice(i, i + 8).map(card).join('')}</div>`);
      const v = $('#certView');
      v.innerHTML = `<div class="modal cards-sheet"><div class="cert-actions" style="margin:0 0 10px"><button class="btn ok" id="kPrint">🖨️ طباعة (${kids.length} بطاقة)</button><button class="btn ghost" id="kClose">إغلاق</button></div>${pages.join('')}</div>`;
      v.classList.remove('hidden');
      $('#kClose').onclick = () => v.classList.add('hidden');
      $('#kPrint').onclick = () => NATIVE ? NATIVE.print() : window.print();
    };
    $$('[data-n]', el).forEach(b => b.onclick = () => {
      const s = DB.students[b.dataset.n];
      const m = modal(`<h3>✏️ تصحيح اسم الطالب — ${classLabel(s)}</h3><div class="row name-row">${nameFields('t', s.name)}</div>
        <p class="muted">سيُعاد إصدار كل أكواد الطالب بالاسم الجديد. الشهادات المطبوعة بالاسم القديم تصبح غير صالحة، فاطبعها من جديد.</p>
        <div class="row"><button class="btn" data-ok>حفظ</button><button class="btn ghost" data-x>إلغاء</button></div>`);
      $('[data-x]', m.el).onclick = m.close;
      $('[data-ok]', m.el).onclick = () => {
        const parts = readName('t', m.el), err = nameError(parts); if (err) return toast(err);
        const n = { name: parts.join(' '), grade: s.grade, section: s.section };
        if (Object.values(DB.students).some(x => x !== s && sameName(x, n))) return toast('يوجد طالب آخر بنفس الاسم والصف.');
        s.name = n.name; s.codes.forEach(c => { c.code = Codes.make(c.kind, c.ref, s, c.date); });
        save(); m.close(); teacherPanel('students');
      };
    });

    $$('[data-v]', el).forEach(b => b.onclick = () => {
      const s = DB.students[b.dataset.v];
      const m = modal(`<h3>${esc(s.name)} — ${classLabel(s)}</h3><table class="codes-table"><tr><th>الإنجاز</th><th>التاريخ</th><th>الكود</th></tr>${s.codes.filter(c => c.kind === 'C').map(c => `<tr><td>${esc(c.title)}</td><td>${fmtDate(c.date)}</td><td class="cd">${c.code}</td></tr>`).join('')}</table><br><button class="btn" data-x>إغلاق</button>`, 'wide');
      $('[data-x]', m.el).onclick = m.close;
    });
    $$('[data-d]', el).forEach(b => b.onclick = async () => {
      const s = DB.students[b.dataset.d];
      if (await confirmBox(`حذف الطالب <b>${esc(s.name)}</b> وكل تقدّمه من هذا الجهاز؟`, 'حذف')) { delete DB.students[s.id]; save(); teacherPanel('students'); }
    });
  };
  // طالب تجريبي للعرض: «open» كل الدروس مفتوحة، «full» أنهى كل شيء ومعه كل الشهادات والأوسمة
  function makeDemo(kind) {
    let s = Object.values(DB.students).find(x => x.demo === kind);
    if (!s) {
      const now = new Date().toISOString(), id = 'demo-' + kind;
      s = DB.students[id] = { id, name: kind === 'open' ? 'طالب تجريبي مفتوح' : 'طالب تجريبي مكتمل', grade: 6, section: 1, created: now, xp: 0, done: {}, codes: [], badges: {}, heard: {}, demo: kind };
      if (kind === 'full') {
        FLAT.forEach(it => { s.done[it.key] = { date: now, perfect: true, mistakes: 0 }; s.xp += XP[it.type];
          if (it.type === 'boss') addCode(s, 'C', String(it.stage.id), it.stage.certName); else addCode(s, 'D', it.ref, it.title); });
        addCode(s, 'C', '7', FINAL.certName);
        BADGES.forEach(b => { s.badges[b.id] = now; addCode(s, 'B', String(b.id).padStart(2, '0'), 'وسام: ' + b.title); });
      }
      save();
    }
    $('#modalRoot').innerHTML = ''; enter(s);
  }
  TAB.data = el => {
    el.innerHTML = `${NATIVE ? `<h3 class="sec">📦 تصدير نسخة للطلبة (zip)</h3><p class="muted">ملف zip فيه البرنامج مع مجلد تعديلاتك (الأسئلة، الشهادة، الترويسة، الرقم السري) — بدون بيانات الطلبة. انسخه لأجهزة الطلبة وفُكّ الضغط ثم شغّل البرنامج.</p><button class="btn" id="dZip">تصدير نسخة الطلبة</button>` : ''}
      <h3 class="sec">🌐 ملف تعديلات الموقع (custom.json)</h3><p class="muted">ملف موقّع فيه تعديلاتك (الأسئلة، الشهادة، الترويسة، كلمة المرور، روابط Forms وTeams). ارفعه إلى مجلد التطبيق على الموقع ليصل لكل الطلبة.</p><button class="btn ghost" id="dSite">تصدير ملف الموقع</button>
      <h3 class="sec">📤 تصدير سجل الشهادات (Excel)</h3><p class="muted">ملف CSV يفتح في Excel، فيه كل شهادات الطلبة وأكوادها على هذا الجهاز.</p><button class="btn" id="dCsv">تصدير CSV</button>
      <h3 class="sec">💾 نسخة احتياطية</h3><p class="muted">احفظ ملف البيانات كاملاً لنقله إلى جهاز آخر أو للاحتفاظ به.</p><button class="btn ghost" id="dJson">حفظ نسخة احتياطية</button>
      <h3 class="sec">📥 دمج بيانات جهاز آخر</h3><p class="muted">افتح ملف <span class="ltr">data.json</span> (من مجلد <span class="ltr">DigitalGuardians-Data</span> بجانب البرنامج في جهاز آخر) لدمج طلبته هنا. يُحتفظ بالتقدّم الأعلى لكل طالب.</p><button class="btn ghost" id="dImp">استيراد ودمج</button>
      <p class="muted" id="dWhere"></p>`;
    $('#dSite').onclick = async () => download('custom.json', JSON.stringify({ settings: CUSTOM.settings, lessons: CUSTOM.lessons, letterhead: LETTERHEAD || '', sig: await sign(sigText(CUSTOM, LETTERHEAD)) }));
    if (NATIVE) $('#dZip').onclick = async () => {
      if (!NATIVE) return toast('التصدير يعمل من التطبيق على ويندوز');
      const r = await NATIVE.exportZip();
      if (r && r.error) toast('❌ ' + r.error); else if (r) toast('✅ تم حفظ نسخة الطلبة:<br><span class="ltr" style="font-size:14px">' + esc(r.file) + '</span>');
    };
    if (NATIVE) NATIVE.where().then(w => $('#dWhere').innerHTML = '📁 مكان حفظ البيانات: <span class="ltr">' + esc(w) + '</span>');
    $('#dCsv').onclick = () => {
      const rows = [['الاسم', 'الصف', 'الشعبة', 'XP', 'نوع الإنجاز', 'الإنجاز', 'التاريخ', 'الكود']];
      Object.values(DB.students).filter(s => !s.demo).forEach(s => s.codes.filter(c => c.kind === 'C').forEach(c => rows.push([s.name, s.grade, s.section, s.xp, { C: 'شهادة', B: 'وسام', D: 'درس' }[c.kind], c.title, c.date.slice(0, 10), c.code])));
      const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      download('Guardians-certificates-' + new Date().toISOString().slice(0, 10) + '.csv', csv);
    };
    $('#dJson').onclick = () => download('Guardians-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(DB, null, 1));
    $('#dImp').onclick = async () => {
      let txt = null;
      if (NATIVE) txt = await NATIVE.openFile();
      else txt = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => i.files[0].text().then(res); i.click(); });
      if (!txt) return;
      try {
        const other = JSON.parse(txt); let n = 0;
        if (other.seal && other.seal !== Codes.seal(other.students)) toast('⚠️ هذا الملف تم تعديله يدوياً، سيتم الدمج مع ذلك.');
        for (const s of Object.values(other.students || {})) {
          const mine = Object.values(DB.students).find(x => Codes.normName(x.name) === Codes.normName(s.name) && x.grade === s.grade && x.section === s.section);
          if (!mine) { DB.students[s.id] = s; n++; continue; }
          Object.assign(mine.done, s.done, mine.done);
          s.codes.forEach(c => { if (!mine.codes.some(x => x.code === c.code)) mine.codes.push(c); });
          Object.assign(mine.badges, s.badges, mine.badges);
          mine.xp = Math.max(mine.xp, s.xp); n++;
        }
        save(); toast(`✅ تم دمج ${n} طالب.`); teacherPanel('students');
      } catch (e) { toast('❌ الملف غير صالح.'); }
    };
  };
  async function download(name, text) {
    if (NATIVE) { const f = await NATIVE.saveFile(name, text); if (f) toast('✅ تم الحفظ:<br><span class="ltr" style="font-size:14px">' + esc(f) + '</span>'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text])); a.download = name; a.click();
  }
  const pickImage = () => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg';
    i.onchange = () => { const f = i.files[0]; if (!f) return res(null); if (f.size > 1.5e6) { toast('❌ الصورة أكبر من 1.5 ميجا'); return res(null); }
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); };
    i.click();
  });
  TAB.settings = el => {
    const S = SET();
    el.innerHTML = `<p class="muted">هذه الإعدادات تظهر في الشهادة، وتُحفظ في مجلد التعديلات فتنتقل مع «نسخة الطلبة».</p>
    <div class="form-grid">
      <label>اسم المدرسة<input class="field" id="sSchool" value="${esc(S.school)}"></label>
      <label>اسم مدير المدرسة<input class="field" id="sPrin" value="${esc(S.principal)}"></label>
      <label>اسم المعلم المتابع<input class="field" id="sTeacher" value="${esc(S.teacher)}"></label>
      <label>المسمّى الوظيفي للمعلم<input class="field" id="sTitle" value="${esc(S.teacherTitle)}"></label>
      <label style="grid-column:1/-1">بريد المعلم في Teams (لزر «أرسلها لمعلّمي»)<input class="field ltr" id="sMail" value="${esc(S.teacherEmail || '')}" placeholder="name@moe.bh"></label>
      <label style="grid-column:1/-1">رابط Microsoft Forms المعبّأ مسبقاً (لزر «أرسل شهادتي للمعلم»)<input class="field ltr" id="sForms" value="${esc(S.formsLink || '')}" placeholder="https://forms.office.com/Pages/ResponsePage.aspx?id=...">
        <span class="muted" style="font-weight:400;font-size:14px">في Forms اختر «الحصول على رابط معبّأ مسبقاً» واكتب في الإجابات الكلمات: <span class="ltr">NAME · CLASS · STAGE · CODE · APP</span></span></label>
    </div><div style="margin-top:14px"><button class="btn" id="sSave">حفظ الإعدادات</button></div>
    <h3 class="sec">🧪 إرسال تجريبي إلى Forms</h3>
    <p class="muted">يفتح الاستمارة معبّأة باسم وفرقة تختارهما لتجربة وصول البيانات إلى Excel دون إنهاء الدروس، ثم تضغط «إرسال» فيها. تُسجَّل الإجابة ببريدك أنت؛ ولتجربة حالة «معتمد» أضف بريدك مؤقتاً في جدول Roster.</p>
    <div class="form-grid"><label>اسم الطالب<input class="field" id="tName" value="طالب تجريبي للاختبار"></label>
      <div class="row" style="justify-content:flex-start"><label>الصف<select class="field" id="tG">${[1, 2, 3, 4, 5, 6].map(g => `<option ${g === 6 ? 'selected' : ''}>${g}</option>`).join('')}</select></label><label>الشعبة<select class="field" id="tS">${Array.from({ length: 10 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label></div>
      <label style="grid-column:1/-1">الشهادة<select class="field" id="tSt">${[...STAGES, FINAL].map(x => `<option value="${x.id}">${esc(certTitle(x))}</option>`).join('')}</select></label></div>
    <button class="btn ghost" id="tSend">🧪 افتح الاستمارة معبّأة</button>
    <h3 class="sec">🎯 وضع الفعالية</h3>
    <p class="muted">افتح قسماً واحداً فقط لفعالية عن موضوع معيّن، أو أوقف التطبيق كلياً. يصل الإعداد إلى الطلبة بعد <b>«📤 تصدير / استيراد» ← «تصدير ملف الموقع»</b> ورفع custom.json مكان القديم.</p>
    <div class="form-grid"><label>الأقسام المتاحة للطلبة<select class="field" id="eFocus"><option value="">كل الأقسام (الوضع العادي)</option>${STAGES.map(x => `<option value="${x.id}" ${String(S.focusStage || '') === String(x.id) ? 'selected' : ''}>${x.icon} المرحلة ${x.id} فقط: ${esc(x.title)}</option>`).join('')}</select></label>
      <label class="chk" style="align-self:end;display:flex;gap:8px;align-items:center;padding-bottom:14px"><input type="checkbox" id="eClosed" ${S.closed ? 'checked' : ''}> ⏸️ إيقاف التطبيق (لا يستطيع الطلبة الدخول)</label>
      <label style="grid-column:1/-1">رسالة الإيقاف للطلبة<input class="field" id="eMsg" value="${esc(S.closedMsg || '')}" placeholder="التطبيق متوقف مؤقتاً. نراكم قريباً! 👋"></label></div>
    <button class="btn" id="eSave">حفظ وضع الفعالية</button>
    <h3 class="sec">🖼️ ترويسة الشهادة</h3>
    <img class="lh-prev" src="${LETTERHEAD || 'letterhead.png'}" alt="">
    <div class="row" style="justify-content:flex-start"><button class="btn ghost" id="lhPick">تغيير الترويسة (صورة PNG أو JPG)</button>${LETTERHEAD ? '<button class="btn ghost" id="lhReset">استعادة الترويسة الأصلية</button>' : ''}</div>
    <h3 class="sec">🔑 تغيير كلمة مرور لوحة المعلم</h3>
    <div class="form-grid">
      <label>كلمة المرور الحالية<input class="field ltr" id="cOld" type="password"></label><span></span>
      <label>كلمة المرور الجديدة<input class="field ltr" id="cP1" type="password"></label>
      <label>تأكيد كلمة المرور<input class="field ltr" id="cP2" type="password"></label>
    </div><p class="muted" style="font-size:14px">8 خانات على الأقل، فيها حروف وأرقام. تنتقل كلمة المرور مع «نسخة الطلبة».</p>
    <button class="btn ghost" id="cGo">تغيير كلمة المرور</button>`;
    $('#cGo').onclick = async () => {
      const p1 = $('#cP1').value;
      if (!await checkPass($('#cOld').value)) return toast('❌ كلمة المرور الحالية غير صحيحة');
      if (passError(p1)) return toast(passError(p1));
      if (p1 !== $('#cP2').value) return toast('❌ كلمتا المرور غير متطابقتين');
      await setPass(p1); ['cOld', 'cP1', 'cP2'].forEach(k => $('#' + k).value = ''); toast('✅ تم تغيير كلمة المرور');
    };
    $('#eSave').onclick = async () => {
      Object.assign(CUSTOM.settings, { focusStage: $('#eFocus').value, closed: $('#eClosed').checked, closedMsg: $('#eMsg').value.trim() });
      await saveCustom(); if (!ME) renderLogin();
      toast('✅ تم الحفظ على هذا الجهاز.<br>ليصل إلى الطلبة: صدّر <b>ملف الموقع</b> وارفعه مكان custom.json.');
    };
    $('#tSend').onclick = () => {
      if (!SET().formsLink) return toast('❌ احفظ رابط Forms أولاً في الأعلى.');
      const name = $('#tName').value.replace(/\s+/g, ' ').trim(); if (!name) return toast('❌ اكتب اسم الطالب');
      const st = [...STAGES, FINAL].find(x => String(x.id) === $('#tSt').value), upto = st.final ? FLAT : FLAT.filter(it => it.stage.id <= st.id);
      const t = { name, grade: +$('#tG').value, section: +$('#tS').value, done: {}, xp: 0, codes: [] };
      upto.forEach(it => { t.done[it.key] = 1; t.xp += XP[it.type]; });
      t.codes.push({ kind: 'C', ref: String(st.id), code: Codes.make('C', String(st.id), t, new Date().toISOString()) });
      sendToTeacher(t, st);
    };
    $('#sSave').onclick = () => {
      const mail = $('#sMail').value.trim();
      if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast('❌ البريد الإلكتروني غير صحيح');
      const forms = $('#sForms').value.trim();
      if (forms && !formsURL(forms, {})) return toast('❌ رابط Forms غير صحيح. يجب أن يكون رابط Microsoft Forms المعبّأ مسبقاً');
      Object.assign(CUSTOM.settings, { school: $('#sSchool').value.trim() || S.school, principal: $('#sPrin').value.trim(), teacher: $('#sTeacher').value.trim(), teacherTitle: $('#sTitle').value.trim(), teacherEmail: mail, formsLink: forms });
      saveCustom(); toast('✅ تم الحفظ');
    };
    $('#lhPick').onclick = async () => {
      const d = NATIVE ? await NATIVE.letterhead(false) : await pickImage(); if (d) { LETTERHEAD = d; await saveCustom(); teacherPanel('settings'); }
    };
    if (LETTERHEAD) $('#lhReset').onclick = async () => { if (NATIVE) await NATIVE.letterhead(true); LETTERHEAD = null; await saveCustom(); teacherPanel('settings'); };
  };

  // ---- الدروس والأسئلة: معاينة كاملة + تعديل/إضافة/حذف أسئلة الاختيار من متعدد وأكمل الفراغ ----
  const CARD_LABEL = { intro: 'شرح', story: 'قصة', recap: 'ملخّص', mcq: 'اختيار من متعدد', fill: 'أكمل الفراغ', type: 'اكتب الإجابة', order: 'ترتيب', sort: 'تصنيف', hotspot: 'صيّاد الخدع', chat: 'محادثة', meter: 'مقياس كلمة السر' };
  const EDITABLE = { mcq: 1, fill: 1 };
  const plain = t => String(t || '').replace(/\*\*|`/g, '').replace(/\n/g, ' ');
  const cardSummary = c => { const t = plain(c.q || c.lead || c.text || c.title || (c.panels && c.panels[0].text) || '—'); return t.length > 80 ? t.slice(0, 80) + '…' : t; };
  let LS_STAGE = 1;
  function setCards(it, cards) { it.cards = cards; CUSTOM.lessons[it.key] = cards; saveCustom(); }
  TAB.lessons = (el, openKey) => {
    if (openKey) LS_STAGE = +openKey.split('-')[0];
    const st = STAGES.find(x => x.id === LS_STAGE);
    el.innerHTML = `<p class="muted">اعرض أي درس كاملاً دون قيود، وعدّل أسئلة <b>الاختيار من متعدد</b> و<b>أكمل الفراغ</b> أو أضف أسئلة جديدة أو احذفها. التعديلات تُحفظ في مجلد التعديلات وتنتقل مع «نسخة الطلبة».</p>
      <div class="tabs">${STAGES.map(x => `<button class="tab ${x.id === LS_STAGE ? 'on' : ''}" data-st="${x.id}">${x.icon} ${esc(x.title)}</button>`).join('')}</div>
      <div class="ls-list">${st.items.map(it => `<div class="ls-item ${it.key === openKey ? 'open' : ''}">
        <div class="ls-head"><div><b>${esc(it.title)}</b> <span class="muted">· ${it.type === 'boss' ? 'مواجهة الشرير' : it.type === 'mission' ? 'مهمّة' : 'درس'} · ${it.cards.length} بطاقة</span>${CUSTOM.lessons[it.key] ? ' <span class="pill sm">✏️ معدّل</span>' : ''}</div>
          <div class="row"><button class="btn ghost sm" data-pv="${it.key}">👁️ معاينة</button><button class="btn sm" data-op="${it.key}">📝 الأسئلة</button></div></div>
        ${it.key === openKey ? `<ol class="ls-cards">${it.cards.map((c, i) => `<li><span class="pill sm ${EDITABLE[c.t] ? 'ed' : ''}">${CARD_LABEL[c.t] || c.t}</span> <span class="ls-sum">${esc(cardSummary(c))}</span>
          <span class="ls-act">${EDITABLE[c.t] ? `<button class="btn ghost sm" data-ed="${i}">✏️ تعديل</button><button class="btn bad sm" data-del="${i}">🗑️</button>` : ''}<button class="btn ghost sm" data-add="${i}">➕ سؤال بعده</button></span></li>`).join('')}</ol>
          ${CUSTOM.lessons[it.key] ? '<button class="btn ghost sm" data-rs>↩️ إرجاع هذا الدرس لأصله</button>' : ''}` : ''}</div>`).join('')}</div>`;
    $$('[data-st]', el).forEach(b => b.onclick = () => { LS_STAGE = +b.dataset.st; TAB.lessons(el); });
    $$('[data-op]', el).forEach(b => b.onclick = () => TAB.lessons(el, b.dataset.op === openKey ? null : b.dataset.op));
    $$('[data-pv]', el).forEach(b => b.onclick = () => { $('#modalRoot').innerHTML = ''; startItem(FLAT.find(x => x.key === b.dataset.pv), true); });
    if (!openKey) return;
    const it = FLAT.find(x => x.key === openKey), back = () => TAB.lessons(el, openKey);
    $$('[data-ed]', el).forEach(b => b.onclick = () => editCard(it, +b.dataset.ed, false, it.cards[+b.dataset.ed].t, back));
    $$('[data-add]', el).forEach(b => b.onclick = () => {
      const m = modal(`<h3>نوع السؤال الجديد</h3><div class="row"><button class="btn" data-t="mcq">اختيار من متعدد</button><button class="btn" data-t="fill">أكمل الفراغ</button><button class="btn ghost" data-x>إلغاء</button></div>`);
      $('[data-x]', m.el).onclick = m.close;
      $$('[data-t]', m.el).forEach(t => t.onclick = () => { m.close(); editCard(it, +b.dataset.add, true, t.dataset.t, back); });
    });
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (it.cards.length < 2) return toast('لا يمكن حذف آخر بطاقة في الدرس');
      if (!await confirmBox('حذف هذا السؤال؟<br><span class="muted">' + esc(cardSummary(it.cards[+b.dataset.del])) + '</span>', 'حذف')) return;
      const cards = it.cards.slice(); cards.splice(+b.dataset.del, 1); setCards(it, cards); back();
    });
    const rs = $('[data-rs]', el);
    if (rs) rs.onclick = async () => { if (await confirmBox('إرجاع هذا الدرس لأسئلته الأصلية؟ ستُحذف تعديلاتك عليه.', 'إرجاع')) { delete CUSTOM.lessons[it.key]; it.cards = it.orig; saveCustom(); back(); } };
  };
  // محرّر سؤال: idx = موقع السؤال (أو الموقع الذي يُضاف بعده)
  function editCard(it, idx, isNew, t, done) {
    const c = isNew ? (t === 'mcq' ? { t, q: '', options: ['', '', ''], a: -1 } : { t, q: 'أكمل الجملة:', src: '', tokens: [], a: [] }) : JSON.parse(JSON.stringify(it.cards[idx]));
    const common = `<label>تمهيد قبل السؤال (اختياري)<textarea class="field" id="eLead" rows="2">${esc(c.lead || '')}</textarea></label>
      <label>السؤال<input class="field" id="eQ" value="${esc(c.q || '')}"></label>`;
    const why = `<label>توضيح يظهر بعد الإجابة (اختياري)<input class="field" id="eWhy" value="${esc(c.why || '')}"></label>`;
    let body;
    if (t === 'mcq') {
      const right = c.multi ? c.a : [c.a];
      body = common + `<div class="zone-label">الخيارات — علّم الإجابة الصحيحة (يمكن أكثر من واحدة)</div><div id="eOpts">${c.options.map((o, i) => optRow(o, right.includes(i))).join('')}</div>
        <button class="btn ghost sm" id="eAddOpt">➕ خيار</button>` + why;
    } else {
      const a = c.a, extra = c.tokens.slice(); a.forEach(w => { const k = extra.indexOf(w); if (k >= 0) extra.splice(k, 1); });
      const text = c.src.replace(/\{\{(\d+)\}\}/g, (_, i) => '[[' + a[i] + ']]');
      body = common + `<label>الجملة — ضع كل إجابة بين قوسين مزدوجين، مثل: كلمة السر القوية [[طويلة]] وفيها رموز<textarea class="field" id="eSrc" rows="3" dir="auto">${esc(text)}</textarea></label>
        <label>بطاقات إضافية للتمويه (اختياري — افصل بينها بفاصلة)<input class="field ltr" id="eExtra" dir="auto" value="${esc(extra.join(', '))}"></label>` + why;
    }
    const m = modal(`<h2>${isNew ? '➕ سؤال جديد' : '✏️ تعديل سؤال'} — ${CARD_LABEL[t]}</h2><div class="editor-form">${body}</div>
      <div class="row" style="margin-top:14px"><button class="btn" data-s>حفظ</button><button class="btn ghost" data-x>إلغاء</button></div>`, 'wide');
    $('[data-x]', m.el).onclick = m.close;
    if (t === 'mcq') {
      const wire = () => $$('[data-rm]', m.el).forEach(b => b.onclick = () => { if ($$('.opt-row', m.el).length > 2) b.closest('.opt-row').remove(); });
      wire();
      $('#eAddOpt', m.el).onclick = () => { if ($$('.opt-row', m.el).length >= 6) return; $('#eOpts', m.el).insertAdjacentHTML('beforeend', optRow('', false)); wire(); };
    }
    $('[data-s]', m.el).onclick = () => {
      const q = $('#eQ', m.el).value.trim(), lead = $('#eLead', m.el).value.trim(), w = $('#eWhy', m.el).value.trim();
      if (!q) return toast('❌ اكتب السؤال');
      c.q = q; if (lead) c.lead = lead; else delete c.lead; if (w) c.why = w; else delete c.why;
      if (t === 'mcq') {
        const rows = $$('.opt-row', m.el).map(r => ({ v: $('input[type=text]', r).value.trim(), ok: $('input[type=checkbox]', r).checked })).filter(r => r.v);
        if (rows.length < 2) return toast('❌ اكتب خيارين على الأقل');
        const right = rows.map((r, i) => r.ok ? i : -1).filter(i => i >= 0);
        if (!right.length) return toast('❌ علّم الإجابة الصحيحة');
        c.options = rows.map(r => r.v);
        if (right.length > 1) { c.multi = true; c.a = right; } else { delete c.multi; c.a = right[0]; }
      } else {
        const a = [], src = $('#eSrc', m.el).value.replace(/\[\[(.+?)\]\]/g, (_, x) => { a.push(x.trim()); return '{{' + (a.length - 1) + '}}'; });
        if (!a.length) return toast('❌ ضع إجابة واحدة على الأقل بين [[ ]]');
        c.src = src; c.a = a;
        c.tokens = a.concat($('#eExtra', m.el).value.split(/[,،]/).map(x => x.trim()).filter(Boolean));
      }
      const cards = it.cards.slice();
      if (isNew) cards.splice(idx + 1, 0, c); else cards[idx] = c;
      setCards(it, cards); m.close(); done();
    };
  }
  const optRow = (v, ok) => `<div class="opt-row"><label class="chk"><input type="checkbox" ${ok ? 'checked' : ''}> صحيحة</label><input type="text" class="field" dir="auto" value="${esc(v)}"><button class="btn bad sm" data-rm title="حذف الخيار">✖</button></div>`;

  // ====================== بدء التشغيل ======================
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !$('#player').classList.contains('hidden') && !$('#modalRoot').children.length && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
      const b = $('#pBtn'); if (b && !b.disabled) b.click();
    }
  });
  window.__dbg = { get P() { return P; }, get ME() { return ME; }, result: (ok) => result(ok) };
  // رابط رمز QR: ‎#c=الكود‎ يفتح نافذة النقل والكود مكتوب فيها
  const codeFromHash = () => { const m = location.hash.match(/#c=(\d{16})/); if (!m) return; history.replaceState(null, '', location.pathname + location.search); askTransfer(m[1].replace(/(\d{4})(?=\d)/g, '$1-')); };
  // لوحة المعلم مخفية عن الطلبة: تُفتح بالرابط ‎#teacher‎ أو بالاختصار Ctrl+Alt+T
  const teacherFromHash = () => { if (location.hash !== '#teacher') return; history.replaceState(null, '', location.pathname + location.search); teacherLogin(); };
  document.addEventListener('keydown', e => { if (e.ctrlKey && e.altKey && e.code === 'KeyT') { e.preventDefault(); teacherLogin(); } });
  loadDB().then(loadCustom).then(renderLogin).then(codeFromHash).then(teacherFromHash);
  addEventListener('hashchange', () => { codeFromHash(); teacherFromHash(); });
})();
