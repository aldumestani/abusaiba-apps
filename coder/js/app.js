/* مبرمج أبوصيبع المحترف — CodeKids */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = Run.esc;
  const NATIVE = window.native || null;

  // ====================== التخزين ======================
  const DEFAULT_SETTINGS = {
    school: 'مدرسة أبوصيبع الابتدائية للبنين', teacher: 'أ. جهاد محمد الدمستاني',
    teacherTitle: 'اختصاصي تكنولوجيا التعليم', principal: 'أ. حسين علي الدرازي', sound: true,
  };
  let DB = { version: 1, settings: { ...DEFAULT_SETTINGS }, students: {}, seal: '' };
  let ME = null; // الطالب الحالي
  const APP_NAME = 'مبرمج أبوصيبع المحترف';
  // تعديلات المعلم: إعدادات الشهادة + الأسئلة المعدّلة (تُحفظ في مجلد CodeKids-Custom بجانب exe)
  let CUSTOM = { settings: {}, lessons: {} }, LETTERHEAD = null;
  const SET = () => ({ ...DEFAULT_SETTINGS, ...DB.settings, ...CUSTOM.settings });
  // ---- حماية لوحة المعلم: كلمة مرور مجزّأة (PBKDF2) + توقيع ملف التعديلات (HMAC) ----
  const SIGN_KEY = '+4zojnNI/3jm0BYdVItuYfFhlDpXbSD3';
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
    const loc = localStorage.getItem('codekids-custom');
    if (loc) return { data: JSON.parse(loc), letterhead: localStorage.getItem('codekids-lh') };
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
      if (NATIVE) await NATIVE.saveCustom(out); else { localStorage.setItem('codekids-custom', JSON.stringify(out)); LETTERHEAD ? localStorage.setItem('codekids-lh', LETTERHEAD) : localStorage.removeItem('codekids-lh'); }
    } catch (e) { toast('❌ تعذّر حفظ التعديلات'); }
  }

  async function loadDB() {
    let d = null;
    try { d = NATIVE ? await NATIVE.load() : JSON.parse(localStorage.getItem('codekids') || 'null'); } catch (e) {}
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
      try { NATIVE ? await NATIVE.save(DB) : localStorage.setItem('codekids', JSON.stringify(DB)); } catch (e) { console.error(e); }
    }, 150);
  }

  // ====================== أدوات ======================
  // نطق المصطلحات الإنجليزية (صوت ويندوز، بدون إنترنت)
  let voice = null;
  function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  function say(word) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; u.rate = .8; if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    } catch (e) {}
    if (ME) { ME.heard = ME.heard || {}; if (!ME.heard[word]) { ME.heard[word] = 1; save(); } }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-say]');
    if (t) { e.stopPropagation(); e.preventDefault(); t.classList.add('heard'); t.classList.remove('nudge'); say(t.dataset.say); $$('.say-hint').forEach(h => h.remove()); }
  }, true);
  // الكلمات الإنجليزية داخل النص العريض **...** تصبح أزرار نطق
  const term = w => `<span class="term ${ME && ME.heard && ME.heard[w] ? 'heard' : 'nudge'}" data-say="${w}" role="button" title="اضغط لتسمع النطق"><span class="ltr">${w}</span> 🔊</span>`;
  const termify = b => b.includes('<') ? b : b.replace(/[A-Za-z][A-Za-z'-]*(?: [A-Za-z][A-Za-z'-]*)*/g, term);

  function fmt(t) {
    t = esc(t || '');
    t = t.replace(/```\n?([\s\S]*?)```/g, (_, c) => '<pre class="code" style="font-size:17px">' + c + '</pre>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, (_, b) => '<b>' + termify(b) + '</b>');
    return t.replace(/\n/g, '<br>');
  }
  const LANG_LABEL = { js: 'JAVASCRIPT', py: 'PYTHON', html: 'HTML', css: 'CSS', txt: '' };
  const codeBlock = (c) => `<pre class="code"><span class="lang">${LANG_LABEL[c.lang] || ''}</span>${Run.highlight(c.src, c.lang)}</pre>`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmtDate = d => new Date(d).toLocaleDateString('ar-BH-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const classLabel = s => `الصف ${s.grade} / ${s.section}`;
  const show = id => { $$('.screen').forEach(e => e.classList.add('hidden')); $('#' + id).classList.remove('hidden'); };

  // ---------- أصوات ----------
  let actx = null;
  function beep(kind) {
    if (!DB.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [[660, .08], [880, .12]], bad: [[220, .18]], win: [[523, .1], [659, .1], [784, .1], [1046, .25]], tap: [[500, .03]] }[kind];
      let t = actx.currentTime;
      for (const [f, d] of seq) {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        gn.gain.setValueAtTime(.12, t); gn.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + d); t += d * .9;
      }
    } catch (e) {}
  }
  function confetti() {
    const em = ['🎉', '⭐', '🎊', '✨', '💜', '🏆'];
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
      const m = modal(`<div class="big-emoji">🤔</div><p style="font-size:20px">${msg}</p><div class="row"><button class="btn bad" data-y>${yes}</button><button class="btn ghost" data-n>${no}</button></div>`);
      $('[data-y]', m.el).onclick = () => { m.close(); res(true); };
      $('[data-n]', m.el).onclick = () => { m.close(); res(false); };
    });
  }
  function toast(msg) {
    const m = modal(`<p style="font-size:19px">${msg}</p><button class="btn">حسناً</button>`);
    $('button', m.el).onclick = m.close;
  }
  async function copy(txt) { try { await navigator.clipboard.writeText(txt); } catch (e) {} }

  // ====================== المنهج ======================
  const FLAT = [];
  STAGES.forEach(st => st.items.forEach((it, i) => { it.key = st.id + '-' + (i + 1); it.ref = '' + st.id + (i + 1); it.stage = st; FLAT.push(it); }));
  const XP = { lesson: 10, practice: 15, quiz: 25 };
  const isDone = (s, it) => !!s.done[it.key];
  // وضع الفعالية: قسم واحد مفتوح (CUSTOM.settings.focusStage)، وطالب الديمو «المفتوح» يتنقّل بحرية
  const focusIds = () => Array.isArray(SET().focusStages) ? SET().focusStages.map(String) : [];
  const inFocus = st => focusIds().includes(String(st.id));
  function isUnlocked(s, it) { const i = FLAT.indexOf(it); return i === 0 || s.demo === 'open' || isDone(s, FLAT[i - 1]) || (inFocus(it.stage) && it === it.stage.items[0]); }
  const stageDone = (s, st) => st.items.every(it => isDone(s, it));
  // شهادة إتمام المنهج كاملاً (بعد المراحل الخمس)
  const FINAL = { id: 6, icon: '🏆', color: '#e6a100', title: 'إتمام المنهج كاملاً', en: 'Full Course', final: true };
  const allDone = s => STAGES.every(st => stageDone(s, st));
  const stageOf = id => String(id) === '6' ? FINAL : STAGES.find(x => String(x.id) === String(id));
  const finalCertCheck = s => allDone(s) && !s.codes.some(c => c.kind === 'C' && c.ref === '6') ? addCode(s, 'C', '6', 'شهادة إتمام المنهج كاملاً') : null;
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
    const lessons = FLAT.filter(it => it.type !== 'quiz' && isDone(s, it)).length;
    const cond = {
      1: lessons >= 1, 2: !!ctx.perfect, 3: lessons >= 5, 4: lessons >= 15, 5: !!s.ranCode,
      6: s.xp >= 100, 7: s.xp >= 300,
      8: stageDone(s, STAGES[0]), 9: stageDone(s, STAGES[1]), 13: stageDone(s, STAGES[2]), 10: stageDone(s, STAGES[3]), 11: stageDone(s, STAGES[4]),
      12: STAGES.every(st => stageDone(s, st)),
    };
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
    ME = null;
    if (SET().closed) { $('#login').innerHTML = `<div class="login-box"><div class="big-emoji">⏸️</div><h1 class="app-title">${APP_NAME}</h1><p style="font-size:22px">${esc(SET().closedMsg || 'التطبيق متوقف مؤقتاً. نراكم قريباً! 👋')}</p></div>`; return show('login'); }
    const list = Object.values(DB.students).filter(s => !s.demo).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    const grades = [1, 2, 3, 4, 5, 6].map(g => `<option value="${g}" ${g === 5 ? 'selected' : ''}>الصف ${g}</option>`).join('');
    const secs = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">شعبة ${i + 1}</option>`).join('');
    $('#login').innerHTML = `
      <div class="login-box">
        <div class="logo">👨‍💻🚀</div>
        <h1 class="app-title">${APP_NAME}</h1>
        <p class="app-sub ltr">CodeKids — Learn to Code</p>
        <div class="school-name">${esc(SET().school)}</div>
        ${list.length ? `<h3>👋 اختر اسمك</h3><div class="students">${list.map(s => `
          <div class="stu" data-id="${s.id}"><div class="avatar">${esc(s.name.trim()[0] || '؟')}</div>
          <div class="n">${esc(s.name)}</div><div class="c">${classLabel(s)} · ⭐ ${s.xp}</div></div>`).join('')}</div>` : ''}
        <div class="new-stu">
          <h3>✨ طالب جديد؟ سجّل اسمك</h3>
          <div class="row">
            ${nameFields('n')}
            <select class="field" id="nGrade">${grades}</select>
            <select class="field" id="nSec">${secs}</select>
          </div>
          <div style="margin-top:14px"><button class="btn" id="nGo">ابدأ التعلّم 🚀</button></div>
        </div>
        <button class="btn ghost sm" id="impBtn" style="margin-top:6px">📥 عندي كود من جهاز آخر</button>
        <div class="dev-credit">فكرة وتطوير: أستاذ جهاد الدمستاني
          <a href="#" id="igLink" class="ig" dir="ltr"><img src="instagram.png" alt=""><span class="ltr">@jehadmstani</span></a></div>
      </div>`;
    $$('.stu').forEach(e => e.onclick = () => enter(DB.students[e.dataset.id]));
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
    DB.students[id] = { id, name, grade, section, created: new Date().toISOString(), xp: 0, done: {}, codes: [], badges: {}, ranCode: false };
    save(); track('register', 'تسجيل طالب جديد'); enter(DB.students[id]);
  }
  function enter(s) { ME = s; s.last = new Date().toISOString(); finalCertCheck(s); save(); renderHome(); }

  // ====================== الصفحة الرئيسية ======================
  const ICON = { lesson: '📘', practice: '💪', quiz: '🏆' };
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
        <button class="iconbtn" id="sndBtn" title="الصوت">${DB.settings.sound ? '🔊' : '🔇'}</button>
        <button class="iconbtn" id="outBtn" title="خروج">🚪</button>
      </div>
      <div class="home-wrap">${s.codes.some(c => c.kind === 'C' && c.ref === '6') ? `<div class="final-banner"><span style="font-size:48px">🏆</span><div><b>أتممت منهج البرمجة كاملاً!</b><br>أنت الآن ${esc(BADGES.find(b => b.id === 12).title)}.</div><button class="btn ok" data-cert="6">📜 شهادة إتمام المنهج</button></div>` : ''}${focusIds().length ? `<div class="focus-banner">🎯 فعالية اليوم: ${STAGES.filter(inFocus).map(x => esc(x.title)).join(' · ')}</div>` : ''}${STAGES.map((st, si) => {
        if (focusIds().length && !inFocus(st)) return '';
        const done = st.items.filter(it => isDone(s, it)).length;
        const locked = si > 0 && s.demo !== 'open' && !focusIds().length && !stageDone(s, STAGES[si - 1]);
        const cert = s.codes.find(c => c.kind === 'C' && c.ref === String(st.id));
        return `<section class="stage ${locked ? 'locked' : ''}">
          <div class="stage-head" style="background:linear-gradient(135deg, ${st.color}, ${st.color}cc)">
            <div class="ic">${st.icon}</div>
            <div style="flex:1"><div class="en">Stage ${st.id} · ${st.en}</div><h2>المرحلة ${st.id}: ${st.title}</h2><p>${st.desc}</p>
            <div class="stage-prog"><i style="width:${done / st.items.length * 100}%"></i></div></div>
          </div>
          ${cert ? `<div class="cert-ready"><span style="font-size:34px">📜</span><div style="flex:1"><b>مبروك! حصلت على شهادة هذه المرحلة</b></div><button class="btn sm" data-cert="${st.id}">عرض الشهادة</button></div>` : ''}
          <div class="path">${st.items.map(it => {
            const d = isDone(s, it), u = isUnlocked(s, it);
            const cls = d ? 'done' : u ? 'current' : 'locked';
            return `<div class="node ${cls}" data-key="${it.key}" ${it === nextIt ? 'id="nextNode"' : ''}>
              <div class="dot">${d ? '✓' : u ? ICON[it.type] : '🔒'}${d && s.done[it.key].perfect ? '<span class="badge-done">★</span>' : ''}</div>
              <div class="t">${esc(it.title)}</div><div class="e">${esc(it.en)}</div>
              <div class="xp">${it.type === 'quiz' ? '🏆 اختبار + شهادة' : it.type === 'practice' ? '💪 تمرين' : '📘 درس'} · +${XP[it.type]} XP</div></div>`;
          }).join('')}</div>
          ${locked ? `<div class="lock-note">🔒 أكمل المرحلة ${st.id - 1} لفتح هذه المرحلة</div>` : ''}
        </section>`;
      }).join('')}</div>`;
    $$('.node').forEach(n => n.onclick = () => {
      const it = FLAT.find(x => x.key === n.dataset.key);
      if (!isUnlocked(s, it)) { beep('bad'); return toast('🔒 هذا الدرس مقفل. أكمل الدرس السابق أولاً!'); }
      startItem(it);
    });
    $$('[data-cert]').forEach(b => b.onclick = () => showCert(s, stageOf(b.dataset.cert)));
    $('#achBtn').onclick = showAchievements;
    $('#moveBtn').onclick = showTransfer;
    if (!nameLocked(s)) $('#nameBtn').onclick = () => editMyName(false, () => renderHome(false));
    $('#outBtn').onclick = renderLogin;
    $('#sndBtn').onclick = () => { DB.settings.sound = !DB.settings.sound; save(); renderHome(false); };
    show('home');
    if (scrollToCurrent) setTimeout(() => { const n = $('#nextNode'); if (n) n.scrollIntoView({ block: 'center' }); }, 50);
  }

  // ====================== مشغّل الدرس ======================
  // يعتمد أسلوب: شرح قصير + تمرين فوري في كل شاشة، والسؤال الخاطئ يعود في آخر الدرس.
  let P = null;
  const NO_CHECK = { intro: 1, recap: 1 };
  const RETRY_IN_PLACE = { robot: 1, code: 1 };
  function startItem(it, preview = false) {
    P = { it, cards: it.cards, queue: it.cards.map((_, i) => i), pos: 0, mistakes: 0, wrongCards: {},
      hearts: it.type === 'quiz' && !preview ? 3 : null, review: preview || isDone(ME, it), preview };
    show('player'); renderCard();
  }
  const curCard = () => P.cards[P.queue[P.pos]];
  function renderCard() {
    const c = curCard();
    P.state = 'idle'; P.answer = null; P.fails = 0; P.ui = {}; P.ran = false;
    const pct = P.pos / P.queue.length * 100;
    const again = P.pos >= P.cards.length;
    $('#player').innerHTML = `
      <div class="p-top">
        <button class="iconbtn" id="pX" title="خروج">✖</button>
        ${P.review ? `<button class="iconbtn" id="pPrev" title="السابق" ${P.pos === 0 ? 'disabled' : ''}>›</button>` : ''}
        <div class="p-prog"><i style="width:${pct}%"></i></div>
        ${P.review ? `<button class="iconbtn" id="pNext" title="التالي">‹</button>` : ''}
        ${P.hearts !== null ? `<div class="hearts">${'❤️'.repeat(P.hearts)}${'🤍'.repeat(3 - P.hearts)}</div>` : ''}
        <div class="p-title">${esc(P.it.title)}</div>
      </div>
      <div class="p-body"><div class="card ${c.t === 'code' && c.story ? 'wide' : ''}" id="card">${again ? '<div class="again">🔁 سؤال للمراجعة — حاول مرة أخرى!</div>' : ''}</div></div>
      <div class="p-bottom" id="pBottom"><div class="fb" id="fb"></div><button class="btn" id="pBtn"></button></div>`;
    $('#pX').onclick = async () => { if (P.preview) return endPreview(); if (P.review || await confirmBox('هل تريد الخروج؟ سيضيع تقدّمك في هذا الدرس.', 'خروج', 'أكمل الدرس')) renderHome(); };
    if (P.review) {
      $('#pPrev').onclick = () => { if (P.pos > 0) { P.pos--; renderCard(); } };
      $('#pNext').onclick = () => next();
    }
    const holder = document.createElement('div'); $('#card').appendChild(holder);
    RENDER[c.t](holder, c);
    sayHint();
    if (NO_CHECK[c.t]) setBottom('continue');
    else if (c.t === 'play') setBottom('play');
    else setBottom('check');
  }
  // تلميح: أول مرة تظهر كلمة إنجليزية لم يسمعها الطالب
  function sayHint() {
    const t = $('.card .term.nudge'); if (!t || !ME || P.hinted || Object.keys(ME.heard || {}).length >= 3) return;
    P.hinted = true;
    const h = document.createElement('div'); h.className = 'say-hint';
    h.innerHTML = '<div class="sh-face">🔊</div><div>اضغط على <b>الكلمة الإنجليزية الصفراء</b> لتسمع نطقها!</div>';
    $('#card').prepend(h);
  }
  function setBottom(mode, fbHtml = '', tone = '') {
    const b = $('#pBottom'), btn = $('#pBtn');
    b.className = 'p-bottom ' + tone; $('#fb').innerHTML = fbHtml;
    btn.className = 'btn' + (tone === 'ok' ? ' ok' : tone === 'bad' ? ' bad' : '');
    P.mode = mode;
    if (mode === 'continue') { btn.textContent = 'متابعة ←'; btn.disabled = false; btn.onclick = next; }
    else if (mode === 'play') { btn.textContent = 'متابعة ←'; btn.onclick = next; btn.disabled = !P.ran; if (!P.ran) $('#fb').innerHTML = '<span class="muted">اضغط ▶ تشغيل لترى النتيجة</span>'; }
    else if (mode === 'retry') { btn.textContent = 'حاول مرة أخرى'; btn.disabled = false; btn.onclick = () => { const c = curCard(); setBottom('check'); RESET[c.t] && RESET[c.t](c); updateCheck(); }; }
    else { btn.textContent = 'تحقّق ✓'; btn.onclick = check; updateCheck(); }
  }
  function updateCheck() {
    const btn = $('#pBtn'); if (!btn) return;
    if (P.mode === 'play') { btn.disabled = !P.ran; if (P.ran) $('#fb').innerHTML = ''; return; }
    if (P.mode !== 'check') return;
    const c = curCard();
    btn.disabled = !(READY[c.t] ? READY[c.t](c) : true);
  }
  const PRAISE = ['أحسنت! 🎉', 'رائع! 🌟', 'ممتاز يا بطل! 💪', 'صحيح! 👏', 'إجابة ذكية! 🧠', 'عمل رائع! 🚀', 'أنت مبرمج حقيقي! 😎', 'استمر هكذا! ⭐'];
  async function check() {
    const c = curCard(), idx = P.queue[P.pos];
    $('#pBtn').disabled = true;
    const r = await CHECK[c.t](c);
    if (r.ok) {
      beep('ok');
      return setBottom('continue', PRAISE[Math.floor(Math.random() * PRAISE.length)] + (c.why ? `<small>${fmt(c.why)}</small>` : '') + (r.extra || ''), 'ok');
    }
    beep('bad'); P.fails++;
    if (!P.wrongCards[idx]) { P.wrongCards[idx] = 1; P.mistakes++; }
    if (P.hearts !== null) {
      P.hearts--;
      $('.hearts').innerHTML = '❤️'.repeat(Math.max(0, P.hearts)) + '🤍'.repeat(3 - Math.max(0, P.hearts));
      if (P.hearts <= 0) return quizFail();
    }
    if (RETRY_IN_PLACE[c.t]) {
      let extra = '';
      if (c.t === 'code' && P.fails >= 2 && c.solution) extra = '<small>💡 يمكنك الضغط على <b>👀 عرض الحل</b> إذا احتجت.</small>';
      if (c.t === 'code' && P.fails >= 2) { const s = $('#edSol'); if (s) s.classList.remove('hidden'); }
      return setBottom('retry', (r.msg || 'ليس تماماً… حاول مرة أخرى 🤔') + extra, 'bad');
    }
    REVEAL[c.t] && REVEAL[c.t](c);
    let note = '';
    if (P.hearts === null && !P.review) { P.queue.push(idx); note = '<small>🔁 لا بأس! سيعود هذا السؤال في آخر الدرس لتتدرّب عليه.</small>'; }
    setBottom('continue', 'إجابة غير صحيحة' + (r.msg ? `<small>${r.msg}</small>` : '') + (c.why ? `<small>${fmt(c.why)}</small>` : '') + note, 'bad');
  }
  function next() {
    P.pos++;
    if (P.pos >= P.queue.length) { if (P.preview) return endPreview(); if (P.review) return renderHome(false); return finishItem(); }
    renderCard();
    $('.p-body').scrollTop = 0;
  }
  // معاينة المعلم: يعود للوحة المعلم بدل الواجهة
  function endPreview() { const k = P.it.key; P = null; show('login'); teacherPanel('lessons', k); }
  function quizFail() {
    const m = modal(`<div class="big-emoji">💔</div><div class="done-title">انتهت القلوب!</div>
      <p style="font-size:19px">لا بأس، كل المبرمجين يتعلّمون من الأخطاء. راجع الدروس ثم حاول الاختبار مرة أخرى 💪</p>
      <div class="row"><button class="btn" data-r>إعادة الاختبار</button><button class="btn ghost" data-h>العودة للدروس</button></div>`);
    $('[data-r]', m.el).onclick = () => { m.close(); startItem(P.it); };
    $('[data-h]', m.el).onclick = () => { m.close(); renderHome(); };
  }

  // تعديل/تأكيد الاسم مع معاينة الشهادة. confirm=true: عند إنهاء أول درس (بعده يُقفل الاسم)
  // ---- نقل التقدّم إلى جهاز آخر: كود من 16 رقماً، موقّع ومرتبط باسم الطالب وصفّه (بلا خادم ولا حسابات) ----
  // التقدّم متسلسل، فيكفي عدد الدروس المنجزة + النقاط + أوسمة لا تُستنتج + نسخة + توقيع 30 بت = 53 بت < 16 رقماً
  const SITE_URL = 'https://abusaiba-apps.com/coder/';
  const FLAG_BADGES = [2, 5];
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
  const stageCertTitle = st => 'شهادة المرحلة ' + st.id + ': ' + st.title;
  function applyCode(t, r) {
    const today = new Date().toISOString();
    FLAT.slice(0, r.n).forEach(it => {
      if (isDone(t, it)) return;
      t.done[it.key] = { date: today, perfect: false, mistakes: 0 };
      if (it.type === 'quiz') addCode(t, 'C', String(it.stage.id), stageCertTitle(it.stage)); else addCode(t, 'D', it.ref, it.title);
    });
    t.xp = Math.max(t.xp, r.xp);
    FLAG_BADGES.forEach((id, i) => { if (r.f & (1 << i) && !t.badges[id]) { t.badges[id] = today; addCode(t, 'B', String(id).padStart(2, '0'), 'وسام: ' + BADGES.find(b => b.id === id).title); } });
    if (r.f & 2) t.ranCode = true;
    finalCertCheck(t);
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
      if (!t) { const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); t = DB.students[id] = { id, name: w.name, grade: w.grade, section: w.section, created: new Date().toISOString(), xp: 0, done: {}, codes: [], badges: {}, ranCode: false }; }
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
    let gained = 0, rec = null, cert = null, finalCert = null;
    if (first) {
      gained = XP[it.type] + (perfect && it.type !== 'quiz' ? 5 : 0);
      s.xp += gained;
      s.done[it.key] = { date: new Date().toISOString(), perfect, mistakes: P.mistakes };
      if (it.type === 'quiz') cert = addCode(s, 'C', String(it.stage.id), 'شهادة المرحلة ' + it.stage.id + ': ' + it.stage.title);
      else rec = addCode(s, 'D', it.ref, it.title);
      finalCert = finalCertCheck(s);
      if (cert) track('cert-' + it.stage.id, 'شهادة المرحلة ' + it.stage.id);
      if (finalCert) track('course-complete', 'إتمام المنهج');
    } else {
      rec = s.codes.find(c => c.kind === 'D' && c.ref === it.ref);
      cert = it.type === 'quiz' ? s.codes.find(c => c.kind === 'C' && c.ref === String(it.stage.id)) : null;
      if (perfect && !s.done[it.key].perfect) s.done[it.key].perfect = true;
    }
    const badges = checkBadges(s, { perfect: perfect && it.type !== 'quiz' && first });
    save();
    beep('win'); confetti();
    const title = it.type === 'quiz' ? 'نجحت في الاختبار! 🏆' : it.type === 'practice' ? 'أنجزت التمرين! 💪' : first ? 'أكملت الدرس! 🎉' : 'أحسنت المراجعة! 👍';
    const m = modal(`
      <div class="big-emoji">${it.type === 'quiz' ? '🏆' : perfect ? '🌟' : '🎉'}</div>
      <div class="done-title">${title}</div>
      <p class="muted" style="margin:0">لقد تعلّمت: <b>${esc(it.title)}</b> — <span class="ltr">${esc(it.en)}</span></p>
      <div class="stats">${gained ? `<span class="pill">⭐ +${gained} XP</span>` : ''}${perfect ? '<span class="pill">🎯 بدون أخطاء</span>' : `<span class="pill">🔁 ${P.mistakes} أسئلة أعدتها</span>`}</div>
      ${cert ? `<div class="code-box gold"><div class="cd" style="font-family:inherit;letter-spacing:0">📜 مبروك! حصلت على شهادة المرحلة ${it.stage.id}</div></div>` : ''}
      ${finalCert ? `<div class="code-box gold"><div class="cd" style="font-family:inherit;letter-spacing:0">🏆 وأتممت المنهج كاملاً! حصلت على شهادة إتمام المنهج</div></div>` : ''}
      ${cert && first && SET().formsLink ? `<div class="send-box"><b>📨 أرسل إنجازك لمعلمك</b> ليُسجَّل في سجل المدرسة.<br><button class="btn forms" data-f>📨 أرسل الآن</button></div>` : ''}
      ${badges.map(b => `<div class="code-box badge"><div class="cd" style="font-family:inherit;letter-spacing:0;font-size:22px">🏅 وسام جديد: ${b.badge.icon} ${b.badge.title}</div><div class="lbl">${b.badge.desc}</div></div>`).join('')}
      <div class="row" style="margin-top:8px">${cert ? '<button class="btn ok" data-c>📜 عرض شهادتي</button>' : ''}<button class="btn" data-h>متابعة التعلّم ←</button></div>`);
    $('[data-h]', m.el).onclick = () => { m.close(); renderHome(); };
    if (cert) $('[data-c]', m.el).onclick = () => { m.close(); renderHome(); showCert(s, finalCert ? FINAL : it.stage); };
    if ($('[data-f]', m.el)) $('[data-f]', m.el).onclick = e => { sendToTeacher(s, finalCert ? FINAL : it.stage); e.target.textContent = '✅ فُتح النموذج، اضغط «إرسال» فيه'; };
  }

  // ====================== أنواع البطاقات ======================
  const RENDER = {}, CHECK = {}, READY = {}, RESET = {}, REVEAL = {};
  // رأس البطاقة: صورة + سطر شرح + مثال كود + المطلوب
  function head(c) {
    return `${c.img ? `<div class="img ${c.imgSmall ? 'sm' : ''}">${c.img}</div>` : ''}
      ${c.lead ? `<div class="lead">${fmt(c.lead)}</div>` : ''}
      ${c.code ? codeBlock(c.code) : ''}
      ${c.q ? `<div class="q">${fmt(c.q)}</div>` : ''}`;
  }

  // ---- intro: شرح قصير (يُستخدم قليلاً) ----
  RENDER.intro = (el, c) => {
    el.innerHTML = `${c.img ? `<div class="img">${c.img}</div>` : ''}${c.title ? `<h2 class="c-title">${fmt(c.title)}</h2>` : ''}<div class="txt">${fmt(c.text)}</div>
      ${c.code ? codeBlock(c.code) + (c.code.run ? `<button class="btn ghost sm" id="tryBtn">▶ جرّب الكود</button><div class="run-out" id="tryOut"></div>` : '') : ''}
      ${c.note ? `<div class="note">${fmt(c.note)}</div>` : ''}`;
    if (c.code && c.code.run) $('#tryBtn').onclick = () => runInto($('#tryOut'), c.code.lang, c.code.src);
  };
  // ---- recap: ماذا تعلّمت ----
  RENDER.recap = (el, c) => {
    el.innerHTML = `<div class="img">🏅</div><h2 class="c-title">ماذا تعلّمت؟</h2>
      <div class="txt">${fmt(c.text || 'عمل رائع! لقد تعلّمت أن:')}</div>
      <ul class="recap">${c.points.map(p => `<li>🌟 ${fmt(p)}</li>`).join('')}</ul>
      ${c.next ? `<div class="note">${fmt('في الدرس القادم: ' + c.next)}</div>` : ''}`;
  };
  async function runInto(box, lang, src) {
    if (lang === 'html' || lang === 'css') {
      box.innerHTML = '<div class="out-label">النتيجة في المتصفّح:</div><iframe class="preview" sandbox="allow-same-origin"></iframe>';
      return Run.runHTML($('iframe', box), src);
    }
    box.innerHTML = '<div class="out-label">المُخرَجات (Output):</div><div class="out">⏳ ...</div>';
    const r = lang === 'py' ? await Run.runPy(src) : await Run.runJS(src);
    $('.out', box).innerHTML = (r.err ? `<span class="errar">⚠️ ${Run.arabicError(r.err)}</span>` : '') + esc(r.out || '') + (r.err ? `\n<span class="err">${esc(r.err)}</span>` : '') + (!r.err && !r.out ? '<span class="muted">(لا يوجد مخرجات)</span>' : '');
    return r;
  }

  // ---- mcq (واختيار متعدد multi) ----
  RENDER.mcq = (el, c) => {
    P.ui.order = c.keep ? c.options.map((_, i) => i) : shuffle(c.options.map((_, i) => i));
    P.answer = c.multi ? [] : null;
    el.innerHTML = head(c) + `${c.multi ? '<div class="muted" style="margin-bottom:8px">✔️ اختر كل الإجابات الصحيحة</div>' : ''}
      <div class="opts">${P.ui.order.map(i => `<button class="opt ${c.multi ? 'multi' : ''}" data-i="${i}">${c.multi ? '<span class="box"></span>' : ''}${fmt(c.options[i])}</button>`).join('')}</div>`;
    $$('.opt', el).forEach(b => b.onclick = () => {
      if (P.state === 'locked') return;
      const i = +b.dataset.i; beep('tap');
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

  // ---- fill: إكمال الفراغات بالبطاقات (كل بطاقة تُستخدم مرة) ----
  const splitSrc = (src) => src.split(/(\{\{\d+\}\})/);
  function srcWithBlanks(c, blankHtml) {
    return `<pre class="code"><span class="lang">${LANG_LABEL[c.lang] || ''}</span>${splitSrc(c.src).map(p => { const m = /^\{\{(\d+)\}\}$/.exec(p); return m ? blankHtml(+m[1]) : Run.highlight(p, c.lang); }).join('')}</pre>`;
  }
  RENDER.fill = (el, c) => {
    P.answer = c.a.map(() => null);
    P.ui.tokens = shuffle(c.tokens.map((t, k) => ({ t, k })));
    el.innerHTML = head(c) + srcWithBlanks(c, i => `<span class="blank" data-b="${i}"></span>`) +
      `<div class="tokens">${P.ui.tokens.map(o => `<button class="tok" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>`;
    $$('.tok', el).forEach(t => t.onclick = () => {
      if (P.state === 'locked') return;
      const i = P.answer.indexOf(null); if (i < 0) return;
      P.answer[i] = +t.dataset.k; drawBlanks(c); beep('tap'); updateCheck();
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

  // ---- type: كتابة الإجابة من الذاكرة ----
  RENDER.type = (el, c) => {
    el.innerHTML = head(c) + srcWithBlanks(c, i => `<span class="blank filled"><input data-b="${i}" spellcheck="false" autocomplete="off" size="${Math.max(4, c.a[i].length + 1)}"></span>`) + '<p class="muted">⌨️ اكتب الإجابة داخل المربع</p>';
    $$('input', el).forEach(i => { i.oninput = updateCheck; i.onkeydown = e => { if (e.key === 'Enter' && !$('#pBtn').disabled) $('#pBtn').click(); }; });
    setTimeout(() => { const i = $('input', el); i && i.focus(); }, 50);
  };
  READY.type = () => $$('.card input').every(i => i.value.trim());
  CHECK.type = async c => {
    const norm = v => { v = v.trim().replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); return c.ci ? v.toLowerCase() : v; };
    const ok = $$('.card input').every(i => norm(i.value) === norm(c.a[+i.dataset.b]));
    $$('.card input').forEach(i => { i.disabled = true; i.parentElement.classList.add(norm(i.value) === norm(c.a[+i.dataset.b]) ? 'b-ok' : 'b-bad'); });
    return { ok };
  };
  REVEAL.type = c => { $$('.card input').forEach(i => { i.value = c.a[+i.dataset.b]; i.parentElement.classList.remove('b-bad'); i.parentElement.classList.add('b-ok'); }); };

  // ---- order: ترتيب الأسطر ----
  RENDER.order = (el, c) => {
    let pool = shuffle(c.lines.map((_, i) => i));
    if (pool.every((v, i) => v === i) && pool.length > 1) pool.reverse();
    P.ui.pool = pool; P.answer = [];
    el.innerHTML = head(c) + `<div class="zone-label">ترتيبك:</div><div class="order-zone answer" id="oAns"></div>
      <div class="zone-label">اضغط على الأسطر بالترتيب الصحيح:</div><div class="order-zone" id="oPool"></div>`;
    drawOrder(c);
  };
  function drawOrder(c) {
    const code = !!c.lang && c.lang !== 'txt';
    const line = (i, n) => `<button class="oline ${code ? 'code' : ''}" data-i="${i}">${n ? `<span class="num">${n}.</span>` : ''}${code ? Run.highlight(c.lines[i], c.lang) : esc(c.lines[i])}</button>`;
    $('#oAns').innerHTML = P.answer.map((i, k) => line(i, k + 1)).join('') || '<div class="muted" style="text-align:center">…</div>';
    $('#oPool').innerHTML = P.ui.pool.filter(i => !P.answer.includes(i)).map(i => line(i)).join('') || '<div class="muted" style="text-align:center">✓</div>';
    $$('#oPool .oline').forEach(b => b.onclick = () => { if (P.state === 'locked') return; P.answer.push(+b.dataset.i); beep('tap'); drawOrder(c); updateCheck(); });
    $$('#oAns .oline').forEach(b => b.onclick = () => { if (P.state === 'locked') return; P.answer = P.answer.filter(x => x !== +b.dataset.i); drawOrder(c); updateCheck(); });
  }
  READY.order = c => P.answer.length === c.lines.length;
  CHECK.order = async c => { P.state = 'locked'; return { ok: P.answer.every((v, i) => c.lines[v] === c.lines[i]) }; };
  REVEAL.order = c => { P.answer = c.lines.map((_, i) => i); drawOrder(c); $('#oAns').classList.add('revealed'); };

  // ---- robot ----
  const DIRS = { up: ['⬆️', -1, 0], down: ['⬇️', 1, 0], left: ['⬅️', 0, -1], right: ['➡️', 0, 1] };
  RENDER.robot = (el, c) => {
    P.answer = []; P.ui.repPick = false;
    el.innerHTML = head(c) + `
      <div class="robot-wrap">
        <div class="grid" id="rGrid" style="grid-template-columns:repeat(${c.grid[0].length}, 58px)"></div>
        <div class="robot-side">
          <div class="zone-label">برنامجك (Program):</div>
          <div class="prog-bar" id="rProg"></div>
          <div id="rRep"></div>
          <div class="palette">${(c.tools || ['up', 'down', 'left', 'right']).map(t => t === 'rep' ? `<button class="rep" data-t="rep">🔁 كرّر</button>` : `<button data-t="${t}" title="${t}">${DIRS[t][0]}</button>`).join('')}
            <button data-t="back" title="حذف آخر أمر">⌫</button><button data-t="clear" title="مسح الكل">🗑️</button></div>
          ${c.max ? `<div class="limit">الحد الأقصى: <b>${c.max}</b> قطع</div>` : ''}
        </div>
      </div>`;
    if (c.preset) P.answer = c.preset.map(x => typeof x === 'number' ? { rep: x } : { d: x });
    drawGrid(c); drawProg(c);
    $$('.palette button', el).forEach(b => b.onclick = () => {
      if (P.state === 'running') return;
      const t = b.dataset.t; beep('tap');
      if (t === 'back') P.answer.pop();
      else if (t === 'clear') P.answer = [];
      else if (t === 'rep') { P.ui.repPick = !P.ui.repPick; }
      else P.answer.push({ d: t });
      if (t !== 'rep') P.ui.repPick = false;
      drawGrid(c); drawProg(c); updateCheck();
    });
  };
  function drawProg(c) {
    $('#rProg').innerHTML = P.answer.length ? P.answer.map((b, i) => b.rep ? `<span class="blk rep" data-k="${i}">🔁×${b.rep}</span>` : `<span class="blk" data-k="${i}">${DIRS[b.d][0]}</span>`).join('') : '<div class="empty">اضغط على الأسهم بالأسفل لبناء البرنامج</div>';
    $('#rRep').innerHTML = P.ui.repPick ? `<div class="zone-label" style="margin-top:8px">كم مرة؟ ثم اختر السهم:</div><div class="rep-pick">${[2, 3, 4, 5, 6, 7, 8].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>` : '';
    $$('#rRep button').forEach(b => b.onclick = () => { P.answer.push({ rep: +b.dataset.n }); P.ui.repPick = false; drawProg(c); updateCheck(); });
  }
  function parseGrid(c) {
    const g = { cells: c.grid.map(r => r.split('')), stars: 0 };
    c.grid.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === 'S') g.s = [y, x]; if (ch === 'G') g.g = [y, x]; if (ch === '*') g.stars++; }));
    return g;
  }
  function drawGrid(c, pos, trail = [], got = []) {
    const g = parseGrid(c); pos = pos || g.s;
    $('#rGrid').innerHTML = g.cells.map((r, y) => r.map((ch, x) => {
      const here = pos[0] === y && pos[1] === x;
      const isTrail = trail.some(t => t[0] === y && t[1] === x);
      const starGone = got.some(t => t[0] === y && t[1] === x);
      let em = ch === '#' ? '🧱' : ch === 'G' ? '🏁' : ch === '*' && !starGone ? '⭐' : '';
      if (here) em = '🤖';
      return `<div class="cell ${ch === '#' ? 'wall' : ''} ${isTrail ? 'trail' : ''}">${em}</div>`;
    }).join('')).join('');
  }
  READY.robot = () => P.answer.some(b => b.d);
  CHECK.robot = c => new Promise(resolve => {
    const g = parseGrid(c);
    if (c.max && P.answer.length > c.max) return resolve({ ok: false, msg: `استخدمت ${P.answer.length} قطع، والمسموح ${c.max} فقط. جرّب استخدام 🔁 التكرار (Loop)!` });
    if (c.mustRep && !P.answer.some(b => b.rep)) return resolve({ ok: false, msg: 'استخدم قطعة 🔁 كرّر في برنامجك!' });
    const steps = []; let rep = 1;
    P.answer.forEach((b, k) => { if (b.rep) rep = b.rep; else { for (let i = 0; i < rep; i++) steps.push({ d: b.d, k }); rep = 1; } });
    let pos = g.s.slice(); const trail = [pos.slice()], got = []; let i = 0;
    P.state = 'running';
    const tick = () => {
      if (i >= steps.length) {
        P.state = 'idle';
        const atGoal = pos[0] === g.g[0] && pos[1] === g.g[1];
        if (!atGoal) return resolve({ ok: false, msg: 'لم يصل الروبوت إلى العَلَم 🏁 راجع الأوامر.' });
        if (got.length < g.stars) return resolve({ ok: false, msg: 'وصل الروبوت لكن لم يجمع كل النجوم ⭐' });
        return resolve({ ok: true });
      }
      const st = steps[i++], [, dy, dx] = DIRS[st.d];
      $$('.blk').forEach(b => b.classList.toggle('active', +b.dataset.k === st.k));
      const ny = pos[0] + dy, nx = pos[1] + dx;
      if (ny < 0 || nx < 0 || ny >= g.cells.length || nx >= g.cells[0].length) { P.state = 'idle'; return resolve({ ok: false, msg: 'خرج الروبوت من الشبكة! 😵' }); }
      if (g.cells[ny][nx] === '#') { P.state = 'idle'; return resolve({ ok: false, msg: 'اصطدم الروبوت بالجدار 🧱 (هذا Bug!)' }); }
      pos = [ny, nx]; trail.push(pos.slice());
      if (g.cells[ny][nx] === '*' && !got.some(t => t[0] === ny && t[1] === nx)) got.push(pos.slice());
      drawGrid(c, pos, trail, got); beep('tap');
      setTimeout(tick, 300);
    };
    setTimeout(tick, 150);
  });
  RESET.robot = c => { drawGrid(c); $$('.blk').forEach(b => b.classList.remove('active')); };

  // ---- trace: تتبّع البرنامج وتوقّع أين يصل الروبوت (مع شبكة مرجعية) ----
  function traceSteps(c) { const st = []; let rep = 1; c.prog.forEach((b, k) => { if (typeof b === 'number') rep = b; else { for (let i = 0; i < rep; i++) st.push({ d: b, k }); rep = 1; } }); return st; }
  function drawTrace(c, pos, trail = [], reveal = null) {
    const g = parseGrid(c); pos = pos || g.s;
    $('#rGrid').innerHTML = g.cells.map((r, y) => r.map((ch, x) => {
      const here = pos[0] === y && pos[1] === x;
      const mark = Object.keys(c.marks).find(m => c.marks[m][0] === y && c.marks[m][1] === x);
      const isTrail = trail.some(t => t[0] === y && t[1] === x);
      let em = ch === '#' ? '🧱' : mark ? `<span class="mark ${reveal === mark ? 'mk-ok' : ''}">${mark}</span>` : '';
      if (here) em = '🤖' + (mark ? `<span class="mark-sm">${mark}</span>` : '');
      return `<div class="cell ${ch === '#' ? 'wall' : ''} ${isTrail ? 'trail' : ''}">${em}</div>`;
    }).join('')).join('');
  }
  RENDER.trace = (el, c) => {
    P.answer = null;
    const letters = Object.keys(c.marks);
    el.innerHTML = head(c) + `
      <div class="robot-wrap">
        <div class="grid" id="rGrid" style="grid-template-columns:repeat(${c.grid[0].length}, 58px)"></div>
        <div class="robot-side">
          <div class="zone-label">البرنامج (يُنفَّذ من اليسار إلى اليمين ➡️):</div>
          <div class="prog-bar">${c.prog.map((b, i) => typeof b === 'number' ? `<span class="blk rep" data-k="${i}">🔁×${b}</span>` : `<span class="blk" data-k="${i}">${DIRS[b][0]}</span>`).join('')}</div>
          <div class="zone-label" style="margin-top:14px">اختر الحرف الذي سيقف عنده الروبوت:</div>
          <div class="opts trace-opts">${letters.map(m => `<button class="opt" data-m="${m}">${m}</button>`).join('')}</div>
        </div>
      </div>`;
    drawTrace(c);
    $$('.opt', el).forEach(b => b.onclick = () => { if (P.state === 'locked') return; $$('.opt', el).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); P.answer = b.dataset.m; beep('tap'); updateCheck(); });
  };
  READY.trace = () => P.answer !== null;
  CHECK.trace = c => new Promise(resolve => {
    P.state = 'locked';
    const g = parseGrid(c), steps = traceSteps(c); let pos = g.s.slice(); const trail = [pos.slice()]; let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        const ok = P.answer === c.a;
        $(`.opt[data-m="${P.answer}"]`).classList.add(ok ? 'right' : 'wrong');
        drawTrace(c, pos, trail, c.a);
        return resolve({ ok, msg: ok ? '' : `شاهد الروبوت: لقد وقف عند الحرف <b>${c.a}</b>` });
      }
      const st = steps[i++], [, dy, dx] = DIRS[st.d];
      $$('.prog-bar .blk').forEach(b => b.classList.toggle('active', +b.dataset.k === st.k));
      pos = [pos[0] + dy, pos[1] + dx]; trail.push(pos.slice()); drawTrace(c, pos, trail); beep('tap');
      setTimeout(tick, 380);
    };
    setTimeout(tick, 150);
  });
  REVEAL.trace = c => { $(`.opt[data-m="${c.a}"]`).classList.add('right'); };

  // ---- محرّر الكود (مشترك بين play و code) ----
  function editorHTML(c, opts = {}) {
    return `<div class="ed-bar"><span class="pill ltr">${LANG_LABEL[c.lang]}</span>${opts.bug ? '<span class="pill bug">🐞 أصلح الخطأ</span>' : ''}<div class="spacer"></div>
        ${c.hint ? '<button class="btn ghost sm" id="edHint">💡 مساعدة</button>' : ''}
        ${c.solution ? '<button class="btn ghost sm hidden" id="edSol">👀 عرض الحل</button>' : ''}
        <button class="btn ghost sm" id="edReset">↺ البداية</button><button class="btn ok sm" id="edRun">▶ تشغيل</button></div>
      <div id="hintBox"></div>
      <textarea class="editor" id="ed" spellcheck="false" autocomplete="off" rows="${Math.max(4, (c.start || '').split('\n').length + 2)}">${esc(c.start || '')}</textarea>
      <div id="edOut"></div><div id="tests"></div>`;
  }
  function wireEditor(c) {
    const ed = $('#ed');
    editorKeys(ed, c.lang);
    ed.oninput = updateCheck;
    $('#edRun').onclick = async () => { await runCode(c); P.ran = true; updateCheck(); };
    $('#edReset').onclick = () => { ed.value = c.start || ''; updateCheck(); };
    if (c.hint) $('#edHint').onclick = () => { $('#hintBox').innerHTML = `<div class="note">${fmt(c.hint)}</div>`; };
    if (c.solution) $('#edSol').onclick = () => { ed.value = c.solution; updateCheck(); };
    setTimeout(() => { ed.focus(); ed.selectionStart = ed.selectionEnd = ed.value.length; }, 50);
  }
  // ---- play: ساحة تجريب (بدون تصحيح) ----
  RENDER.play = (el, c) => {
    el.innerHTML = `${c.title ? `<h2 class="c-title">${fmt(c.title)}</h2>` : ''}${head(c)}` + editorHTML(c);
    wireEditor(c);
  };
  // ---- code: كتابة كود مع اختبار تلقائي ----
  RENDER.code = (el, c) => {
    el.innerHTML = (c.story ? `<div class="story">${c.img ? `<div class="story-img">${c.img}</div>` : ''}<div class="badge-pr">PRACTICE · تمرين</div><div class="txt">${fmt(c.story)}</div></div><h3 class="task-h">🎯 المهمة</h3><div class="q">${fmt(c.q)}</div>` : head(c)) + editorHTML(c, { bug: c.bug });
    wireEditor(c);
  };
  function editorKeys(ed, lang) {
    const IND = lang === 'py' ? '    ' : '  ';
    ed.addEventListener('keydown', e => {
      const s = ed.selectionStart, v = ed.value;
      if (e.key === 'Tab') { e.preventDefault(); ed.setRangeText(IND, s, ed.selectionEnd, 'end'); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(lineStart, s);
        let ind = (/^\s*/.exec(line) || [''])[0];
        if (/[:{]\s*$/.test(line)) ind += IND;
        ed.setRangeText('\n' + ind, s, ed.selectionEnd, 'end');
        ed.dispatchEvent(new Event('input'));
      }
    });
  }
  async function runCode(c) {
    const src = $('#ed').value;
    if (ME && !ME.ranCode && src.trim()) { ME.ranCode = true; save(); }
    return runInto($('#edOut'), c.lang, src);
  }
  READY.code = () => $('#ed') && $('#ed').value.trim().length > 0;
  const normOut = s => String(s || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim();
  CHECK.code = async c => {
    const src = $('#ed').value;
    const r = await runCode(c);
    const tests = $('#tests');
    const panel = (ok, mine, want, msg) => `<div class="test ${ok ? 'ok' : 'bad'}"><div class="t-h">${ok ? '✅ الاختبار ناجح' : '❌ الاختبار لم ينجح'}</div>${msg ? `<div>${msg}</div>` : ''}
      ${want !== undefined ? `<div class="t-cols"><div><div class="out-label">ناتج كودك:</div><pre class="out">${esc(mine) || '<span class="muted">(لا شيء)</span>'}</pre></div><div><div class="out-label">الناتج المطلوب:</div><pre class="out">${esc(want)}</pre></div></div>` : ''}</div>`;
    if (c.lang === 'html') {
      const err = Run.checkHTML(r, c.checks || []);
      tests.innerHTML = panel(!err, '', undefined, err || 'كل الشروط متحققة 👌');
      return err ? { ok: false, msg: err } : { ok: true };
    }
    if (r.err) { tests.innerHTML = panel(false, r.out, c.expect, '⚠️ ' + Run.arabicError(r.err)); return { ok: false, msg: '⚠️ ' + Run.arabicError(r.err) }; }
    if (c.has) for (const h of c.has) if (!src.includes(h)) { const m = `يجب أن تستخدم <code>${esc(h)}</code> في الكود.`; tests.innerHTML = panel(false, r.out, c.expect, m); return { ok: false, msg: m }; }
    const out = normOut(r.out);
    if (c.expect !== undefined && out !== normOut(c.expect)) { tests.innerHTML = panel(false, out, c.expect); return { ok: false, msg: 'ناتج كودك مختلف عن الناتج المطلوب. قارن بينهما 👀' }; }
    if (c.match && !new RegExp(c.match).test(out)) { tests.innerHTML = panel(false, out, undefined, 'الناتج غير مطابق للمطلوب، راجع المهمة.'); return { ok: false, msg: 'الناتج غير مطابق للمطلوب، راجع المهمة.' }; }
    tests.innerHTML = panel(true, out, c.expect);
    tests.scrollIntoView({ block: 'nearest' });
    return { ok: true };
  };
  RESET.code = () => { $('#tests').innerHTML = ''; };
  const _chk = CHECK.code; CHECK.code = async c => { const r = await _chk(c); const t = $('#tests'); if (t) setTimeout(() => t.scrollIntoView({ block: 'end', behavior: 'smooth' }), 50); return r; };

  // ====================== الإنجازات ======================
  function showAchievements() {
    const s = ME;
    const certs = s.codes.filter(c => c.kind === 'C'), lessons = s.codes.filter(c => c.kind === 'D');
    const m = modal(`
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">🎖️ إنجازاتي — ${esc(s.name)}</h2><button class="iconbtn" data-x>✖</button></div>
      <div class="stats"><span class="pill">⭐ ${s.xp} XP</span><span class="pill">📘 ${lessons.length} دروس</span><span class="pill">🏅 ${Object.keys(s.badges).length} أوسمة</span><span class="pill">📜 ${certs.length} شهادات</span></div>
      <h3 class="sec">📜 شهاداتي</h3>
      ${certs.length ? `<div class="badges">${certs.map(c => { const st = stageOf(c.ref); return `<div class="bdg"><div class="i">${st.icon}</div><div class="t">${st.title}</div><button class="btn sm" data-cert="${st.id}" style="margin-top:6px">عرض</button></div>`; }).join('')}</div>` : '<p class="muted">أكمل اختبار أي مرحلة لتحصل على شهادتك الأولى!</p>'}
      <h3 class="sec">🏅 الأوسمة</h3>
      <div class="badges">${BADGES.map(b => { const r = s.codes.find(c => c.kind === 'B' && +c.ref === b.id); return `<div class="bdg ${r ? '' : 'off'}"><div class="i">${b.icon}</div><div class="t">${b.title}</div><div class="d">${b.desc}</div></div>`; }).join('')}</div>
      <h3 class="sec">📘 الدروس التي أكملتها</h3>
      ${lessons.length ? `<table class="codes-table"><tr><th>الدرس</th><th>التاريخ</th></tr>${lessons.map(c => `<tr><td>${esc(itemTitle(c.ref))}</td><td>${fmtDate(c.date)}</td></tr>`).join('')}</table>` : '<p class="muted">لم تكمل أي درس بعد.</p>'}
    `, 'wide');
    $('[data-x]', m.el).onclick = m.close;
    $$('[data-cert]', m.el).forEach(b => b.onclick = () => { showCert(s, stageOf(b.dataset.cert)); });
  }

  // ====================== الشهادة ======================
  function certHTML(s, st, code, date) {
    const S = SET();
    return `<div class="cert" style="--cc:${st.color}">
        <div class="cert-corner" style="top:-8%;right:-6%"></div><div class="cert-corner" style="bottom:-8%;left:-6%"></div>
        <div class="cert-frame"></div>
        <div class="cert-in">
          <div class="cert-head"><img class="letterhead" src="${LETTERHEAD || 'letterhead.png'}" alt=""><div class="credit">فكرة وتطوير: أ. جهاد الدمستاني</div></div>
          <div><div class="medal">${st.icon}🏅</div><div class="ttl">${st.final ? 'شهادة إتمام المنهج' : 'شهادة إتمام'}</div><div class="ttl-en">${st.final ? 'FULL COURSE COMPLETION' : 'CERTIFICATE OF COMPLETION'}</div></div>
          <div class="line">يسرّنا أن نشهد بأن الطالب<br><span class="stu-name">${esc(s.name)}</span><br>
            من ${classLabel(s)} قد أتمّ بنجاح ${st.final ? '<span class="stage-name">جميع مراحل المنهج الخمس</span>' : `<span class="stage-name">المرحلة ${st.id}: ${esc(st.title)}</span> <span class="ltr">(${esc(st.en)})</span>`}<br>
            ضمن برنامج <b>${APP_NAME}</b> لتعلّم البرمجة، بتاريخ ${fmtDate(date)}</div>
          <div class="sig-row">
            <div class="sig"><div class="muted">${esc(S.teacherTitle)}</div><div class="s">${esc(S.teacher)}</div></div>
            <div class="cert-code"><div class="muted" style="font-size:.9em">رمز التحقق من الشهادة</div><div class="cd">${code}</div></div>
            <div class="sig"><div class="muted">مدير المدرسة</div><div class="s">${esc(S.principal)}</div></div>
          </div>
        </div>
      </div>`;
  }
  const certTitle = st => st.final ? 'شهادة إتمام المنهج كاملاً' : `المرحلة ${st.id}: ${st.title}`;
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
      const f = await NATIVE.savePDF(`شهادة ${s.name} - المرحلة ${st.id}`);
      if (f) toast('✅ تم حفظ الشهادة:<br><span class="ltr" style="font-size:14px">' + esc(f) + '</span>');
    };
    if (S.formsLink) $('#cForms').onclick = () => sendToTeacher(s, st);
    if (S.teacherEmail) $('#cTeams').onclick = async () => {
      const msg = `السلام عليكم ${S.teacher}،\nأرسل لك شهادتي في تطبيق «${APP_NAME}»:\nالمرحلة ${st.id}: ${st.title}\nالاسم: ${s.name} — ${classLabel(s)}\nرمز التحقق: ${c.code}`;
      const f = NATIVE ? await NATIVE.shareTeams(`شهادة ${s.name} - المرحلة ${st.id}`, S.teacherEmail, msg) : (window.open('https://teams.microsoft.com/l/chat/0/0?users=' + encodeURIComponent(S.teacherEmail) + '&message=' + encodeURIComponent(msg)), '');
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
      beep('bad'); $('#pin', m.el).value = ''; FAILS++;
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
      if (!await checkRecovery($('#rKey', m.el).value)) { FAILS++; if (FAILS >= 5) LOCK_UNTIL = Date.now() + 60000 * 2 ** Math.min(FAILS - 5, 4); beep('bad'); return msg('رمز الاسترداد غير صحيح.'); }
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
  const kindLabel = p => p.kind === 'C' ? (p.ref === '6' ? '📜 شهادة إتمام المنهج كاملاً' : `📜 شهادة المرحلة ${p.ref}: ${(STAGES.find(s => String(s.id) === p.ref) || {}).title || '؟'}`)
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
      ${list.map(s => { const d = FLAT.filter(it => isDone(s, it)).length; return `<tr><td><b style="color:var(--ink)">${esc(s.name)}</b>${s.demo ? ' <span class="pill sm">🧪 تجريبي</span>' : ''}</td><td>${s.grade}/${s.section}</td><td>${s.xp}</td><td>${d}/${total} (${Math.round(d / total * 100)}%)</td><td>${Object.keys(s.badges).length}</td><td>${s.codes.filter(c => c.kind === 'C').map(c => 'م' + c.ref).join('، ') || '—'}</td>
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
      s = DB.students[id] = { id, name: kind === 'open' ? 'طالب تجريبي مفتوح' : 'طالب تجريبي مكتمل', grade: 6, section: 1, created: now, xp: 0, done: {}, codes: [], badges: {}, ranCode: true, demo: kind };
      if (kind === 'full') {
        FLAT.forEach(it => { s.done[it.key] = { date: now, perfect: true, mistakes: 0 }; s.xp += XP[it.type];
          if (it.type === 'quiz') addCode(s, 'C', String(it.stage.id), 'شهادة المرحلة ' + it.stage.id + ': ' + it.stage.title); else addCode(s, 'D', it.ref, it.title); });
        addCode(s, 'C', '6', 'شهادة إتمام المنهج كاملاً');
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
      <h3 class="sec">📥 دمج بيانات جهاز آخر</h3><p class="muted">افتح ملف <span class="ltr">data.json</span> (من مجلد <span class="ltr">CodeKids-Data</span> بجانب البرنامج في جهاز آخر) لدمج طلبته هنا. يُحتفظ بالتقدّم الأعلى لكل طالب.</p><button class="btn ghost" id="dImp">استيراد ودمج</button>
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
      download('CodeKids-codes-' + new Date().toISOString().slice(0, 10) + '.csv', csv);
    };
    $('#dJson').onclick = () => download('CodeKids-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(DB, null, 1));
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
    <p class="muted">افتح قسماً أو أكثر فقط لفعالية عن موضوع معيّن، أو أوقف التطبيق كلياً. يصل الإعداد إلى الطلبة بعد <b>«📤 تصدير / استيراد» ← «تصدير ملف الموقع»</b> ورفع custom.json مكان القديم.</p>
    <div class="form-grid"><div style="grid-column:1/-1"><b>الأقسام المتاحة للطلبة</b> <span class="muted">(لا تختر شيئاً = كل الأقسام كالمعتاد)</span><div class="row" style="justify-content:flex-start;margin-top:6px">${STAGES.map(x => `<label class="chk" style="display:flex;gap:6px;align-items:center;border:2px solid var(--line);border-radius:12px;padding:6px 10px"><input type="checkbox" class="eFoc" value="${x.id}" ${focusIds().includes(String(x.id)) ? 'checked' : ''}> ${x.icon} ${esc(x.title)}</label>`).join('')}</div></div>
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
      delete CUSTOM.settings.focusStage;
      Object.assign(CUSTOM.settings, { focusStages: $$('.eFoc').filter(x => x.checked).map(x => x.value), closed: $('#eClosed').checked, closedMsg: $('#eMsg').value.trim() });
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
  const CARD_LABEL = { intro: 'شرح', recap: 'ملخّص', mcq: 'اختيار من متعدد', fill: 'أكمل الفراغ', type: 'اكتب الإجابة', order: 'ترتيب', robot: 'روبوت', trace: 'تتبّع', play: 'تجربة كود', code: 'اكتب الكود' };
  const EDITABLE = { mcq: 1, fill: 1 };
  const plain = t => String(t || '').replace(/\*\*|`/g, '').replace(/\n/g, ' ');
  const cardSummary = c => { const t = plain(c.q || c.lead || c.text || c.story || c.title || '—'); return t.length > 80 ? t.slice(0, 80) + '…' : t; };
  let LS_STAGE = 1;
  function setCards(it, cards) { it.cards = cards; CUSTOM.lessons[it.key] = cards; saveCustom(); }
  TAB.lessons = (el, openKey) => {
    if (openKey) LS_STAGE = +openKey.split('-')[0];
    const st = STAGES.find(x => x.id === LS_STAGE);
    el.innerHTML = `<p class="muted">اعرض أي درس كاملاً دون قيود، وعدّل أسئلة <b>الاختيار من متعدد</b> و<b>أكمل الفراغ</b> أو أضف أسئلة جديدة أو احذفها. التعديلات تُحفظ في مجلد التعديلات وتنتقل مع «نسخة الطلبة».</p>
      <div class="tabs">${STAGES.map(x => `<button class="tab ${x.id === LS_STAGE ? 'on' : ''}" data-st="${x.id}">${x.icon} ${esc(x.title)}</button>`).join('')}</div>
      <div class="ls-list">${st.items.map(it => `<div class="ls-item ${it.key === openKey ? 'open' : ''}">
        <div class="ls-head"><div><b>${esc(it.title)}</b> <span class="muted">· ${it.type === 'quiz' ? 'اختبار' : it.type === 'practice' ? 'تمرين' : 'درس'} · ${it.cards.length} بطاقة</span>${CUSTOM.lessons[it.key] ? ' <span class="pill sm">✏️ معدّل</span>' : ''}</div>
          <div class="row"><button class="btn ghost sm" data-pv="${it.key}">👁️ معاينة</button><button class="btn sm" data-op="${it.key}">📝 الأسئلة</button></div></div>
        ${it.key === openKey ? `<ol class="ls-cards">${it.cards.map((c, i) => `<li><span class="pill sm ${EDITABLE[c.t] ? 'ed' : ''}">${CARD_LABEL[c.t] || c.t}</span> <span class="ls-sum">${esc(cardSummary(c))}</span>
          <span class="ls-act">${EDITABLE[c.t] ? `<button class="btn ghost sm" data-ed="${i}">✏️ تعديل</button><button class="btn bad sm" data-del="${i}">🗑️</button>` : ''}<button class="btn ghost sm" data-add="${i}">➕ سؤال بعده</button></span></li>`).join('')}</ol>
          <div class="row" style="justify-content:flex-start"><button class="btn sm" data-ai>🤖 برومبت للذكاء الاصطناعي</button><button class="btn sm" data-bulk>📥 إضافة جماعية (لصق)</button>${CUSTOM.lessons[it.key] ? '<button class="btn ghost sm" data-rs>↩️ إرجاع هذا الدرس لأصله</button>' : ''}</div>` : ''}</div>`).join('')}</div>`;
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
    $('[data-ai]', el).onclick = () => aiPrompt(it);
    $('[data-bulk]', el).onclick = () => bulkAdd(it, back);
    const rs = $('[data-rs]', el);
    if (rs) rs.onclick = async () => { if (await confirmBox('إرجاع هذا الدرس لأسئلته الأصلية؟ ستُحذف تعديلاتك عليه.', 'إرجاع')) { delete CUSTOM.lessons[it.key]; it.cards = it.orig; saveCustom(); back(); } };
  };
  // ---- إضافة جماعية: برومبت جاهز للذكاء الاصطناعي، ثم لصق النتيجة (JSON) في الدرس ----
  function aiPrompt(it) {
    const m = modal(`<h2>🤖 برومبت للذكاء الاصطناعي — ${esc(it.title)}</h2>
      <p class="muted">املأ التفاصيل، ثم انسخ البرومبت والصقه في Copilot أو أي أداة ذكاء اصطناعي. انسخ ما يردّه والصقه في «📥 إضافة جماعية».</p>
      <div class="editor-form">
        <label>الموضوع<input class="field" id="aTopic" value="${esc(it.title)}"></label>
        <label>تفاصيل ونقاط يجب تغطيتها (اختياري)<textarea class="field" id="aDet" rows="3" placeholder="مثال: التنمر في الألعاب الجماعية، ماذا أفعل إذا رأيت صديقي يتعرّض للتنمر، إبلاغ ولي الأمر..."></textarea></label>
        <div class="row" style="justify-content:flex-start">
          <label>الصف<select class="field" id="aG">${[1, 2, 3, 4, 5, 6].map(g => `<option ${g === 5 ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
          <label>بطاقات شرح<input class="field" id="aI" type="number" min="0" max="10" value="2" style="width:80px"></label>
          <label>اختيار من متعدد<input class="field" id="aM" type="number" min="0" max="20" value="5" style="width:80px"></label>
          <label>أكمل الفراغ<input class="field" id="aF" type="number" min="0" max="20" value="3" style="width:80px"></label>
        </div>
      </div>
      <textarea class="field" id="aOut" rows="8" dir="rtl" readonly style="width:100%;margin-top:10px"></textarea>
      <div class="row"><button class="btn" data-cp>📋 نسخ البرومبت</button><button class="btn ghost" data-x>إغلاق</button></div>`, 'wide');
    const build = () => {
      const v = k => $('#' + k, m.el).value.trim();
      $('#aOut', m.el).value = `أنت معلم خبير تكتب محتوى لتطبيق تعليمي تفاعلي لطلبة الصف ${v('aG')} الابتدائي في البحرين، اسمه «${APP_NAME}».
الدرس الحالي: «${it.title}» ضمن مرحلة «${it.stage.title}».
الموضوع المطلوب: ${v('aTopic')}${v('aDet') ? '\nالتفاصيل والنقاط التي يجب تغطيتها: ' + v('aDet') : ''}

المطلوب: ${v('aI')} بطاقات شرح، و${v('aM')} أسئلة اختيار من متعدد، و${v('aF')} أسئلة أكمل الفراغ، مرتّبة بأسلوب «شرح قصير ثم تمرين فوري»: ضع كل بطاقة شرح قبل الأسئلة المتعلقة بها.

القواعد:
- لغة عربية فصيحة بسيطة تناسب عمر الطالب، وجمل قصيرة، وإيموجي مناسب باعتدال.
- اكتب المصطلحات الإنجليزية داخل نجمتين مزدوجتين مع ترجمتها، مثل: **برنامج** (**Program**) — التطبيق يحوّل الكلمة الإنجليزية بين النجمتين إلى زر نطق. استخدم \`علامة الكود\` للأوامر القصيرة.
- اختيار من متعدد: من 2 إلى 6 خيارات، و"a" رقم الإجابة الصحيحة (يبدأ العدّ من 0)، أو مصفوفة أرقام إذا كان أكثر من إجابة صحيحة. الخيارات الخاطئة معقولة وليست سخيفة.
- أكمل الفراغ: في "src" ضع {{0}} و{{1}}… مكان الفراغات بالترتيب، و"a" الإجابات بنفس الترتيب، و"tokens" كل الإجابات مع 1 إلى 3 كلمات تمويه. كل إجابة كلمة أو كلمتان.
- "lead" و"why" و"note" و"title" اختيارية.
- لا تكرر نفس السؤال، وتأكد أن المعلومات صحيحة علمياً ومناسبة للأطفال.

أخرج النتيجة مصفوفة JSON صالحة فقط، دون أي شرح أو نص قبلها أو بعدها، وبهذا الشكل تماماً:
[
  {"t":"intro","img":"🤖","title":"عنوان قصير","text":"شرح قصير بلغة بسيطة.\\nسطر ثانٍ عند الحاجة.","note":"معلومة إضافية (اختياري)"},
  {"t":"mcq","lead":"سطر شرح قصير قبل السؤال (اختياري)","q":"نص السؤال؟","options":["خيار 1","خيار 2","خيار 3"],"a":0,"why":"توضيح يظهر بعد الإجابة"},
  {"t":"mcq","q":"اختر كل الإجابات الصحيحة:","options":["أ","ب","ج","د"],"a":[0,2]},
  {"t":"fill","q":"أكمل:","src":"{{0}} = خطوات مرتّبة لحلّ مشكلة","a":["Algorithm"],"tokens":["Algorithm","Robot","Bug"]}
]`;
    };
    $$('input,textarea,select', m.el).forEach(x => x.oninput = build); build();
    $('[data-cp]', m.el).onclick = async e => { await copy($('#aOut', m.el).value); e.target.textContent = '✅ تم النسخ'; };
    $('[data-x]', m.el).onclick = m.close;
  }
  // يتحقق من بطاقة واحدة ويُرجعها نظيفة بالحقول المسموحة فقط، أو نص الخطأ
  function cleanCard(c) {
    const str = x => typeof x === 'string' && x.trim() !== '', o = {};
    if (!c || typeof c !== 'object') return 'ليست بطاقة';
    for (const k of ['title', 'lead', 'why', 'note']) if (str(c[k])) o[k] = c[k].trim();
    if (c.t === 'intro') { if (!str(c.text)) return 'بطاقة شرح بلا "text"'; if (str(c.img)) o.img = c.img.replace(/[<>&"']/g, '').slice(0, 8); return { t: 'intro', ...o, text: c.text.trim() }; }
    if (!str(c.q)) return 'سؤال بلا "q"';
    o.q = c.q.trim();
    if (c.t === 'mcq') {
      const opts = Array.isArray(c.options) ? c.options.filter(str).map(x => x.trim()) : [];
      if (opts.length !== (c.options || []).length || opts.length < 2 || opts.length > 6) return 'الخيارات يجب أن تكون من 2 إلى 6: ' + o.q;
      const a = Array.isArray(c.a) ? c.a : [c.a];
      if (!a.length || a.some(i => !Number.isInteger(i) || i < 0 || i >= opts.length)) return 'رقم الإجابة الصحيحة "a" غير صحيح: ' + o.q;
      return { t: 'mcq', ...o, options: opts, ...(a.length > 1 ? { multi: true, a: [...new Set(a)] } : { a: a[0] }) };
    }
    if (c.t === 'fill') {
      const a = Array.isArray(c.a) ? c.a.filter(str).map(x => x.trim()) : [];
      if (!a.length || a.length !== c.a.length) return 'أكمل الفراغ بلا إجابات "a": ' + o.q;
      if (!str(c.src) || a.some((_, i) => !c.src.includes('{{' + i + '}}')) || /\{\{(\d+)\}\}/.test(c.src.replace(/\{\{(\d+)\}\}/g, (x, i) => +i < a.length ? '' : x))) return 'الفراغات {{0}}… في "src" لا تطابق الإجابات: ' + o.q;
      const tokens = [...new Set((Array.isArray(c.tokens) ? c.tokens.filter(str).map(x => x.trim()) : []).concat(a))];
      return { t: 'fill', ...o, src: c.src, a, tokens, lang: 'txt' };
    }
    return 'نوع غير مدعوم "' + c.t + '" (المسموح: intro و mcq و fill)';
  }
  function bulkAdd(it, done) {
    const m = modal(`<h2>📥 إضافة جماعية — ${esc(it.title)}</h2>
      <p class="muted">الصق هنا ما ردّه الذكاء الاصطناعي (مصفوفة JSON). المسموح: بطاقات شرح وأسئلة اختيار من متعدد وأكمل الفراغ.</p>
      <textarea class="field ltr" id="bIn" rows="12" dir="auto" style="width:100%" placeholder='[ {"t":"mcq", "q":"...", "options":["...","..."], "a":0} ]'></textarea>
      <div class="row" style="justify-content:flex-start"><label class="chk"><input type="radio" name="bMode" value="add" checked> أضفها إلى الدرس (قبل الملخّص الأخير)</label>
        <label class="chk"><input type="radio" name="bMode" value="replace"> استبدل بطاقات الدرس كلها بها <span class="muted">(يمكن الإرجاع لاحقاً)</span></label></div>
      <p class="warn" id="bMsg"></p>
      <div class="row"><button class="btn" data-s>إضافة</button><button class="btn ghost" data-x>إلغاء</button></div>`, 'wide');
    $('[data-x]', m.el).onclick = m.close;
    $('[data-s]', m.el).onclick = () => {
      const msg = t => { $('#bMsg', m.el).innerHTML = t; };
      let arr; const raw = $('#bIn', m.el).value.trim(), from = raw.indexOf('['), to = raw.lastIndexOf(']');
      try { arr = JSON.parse(raw.slice(from, to + 1)); } catch (e) { return msg('❌ النص ليس JSON صالحاً. تأكد أنك نسخت المصفوفة كاملة من [ إلى ].'); }
      if (!Array.isArray(arr) || !arr.length) return msg('❌ لا توجد بطاقات.');
      const cards = arr.map(cleanCard), bad = cards.map((c, i) => typeof c === 'string' ? `البطاقة ${i + 1}: ${esc(c)}` : '').filter(Boolean);
      if (bad.length) return msg('❌ لم يُضف شيء. صحّح ما يلي:<br>' + bad.slice(0, 8).join('<br>'));
      let out;
      if ($('[name=bMode]:checked', m.el).value === 'replace') out = cards;
      else { out = it.cards.slice(); const last = out.length && out[out.length - 1].t === 'recap' ? out.length - 1 : out.length; out.splice(last, 0, ...cards); }
      setCards(it, out); m.close(); done();
      toast(`✅ أُضيفت ${cards.length} بطاقة. جرّبها بزر «👁️ معاينة»، ثم صدّر <b>ملف الموقع</b> ليصل التعديل للطلبة.`);
    };
  }
  // محرّر سؤال: idx = موقع السؤال (أو الموقع الذي يُضاف بعده)
  function editCard(it, idx, isNew, t, done) {
    const c = isNew ? (t === 'mcq' ? { t, q: '', options: ['', '', ''], a: -1 } : { t, q: 'أكمل الفراغ:', src: '', tokens: [], a: [], lang: 'txt' }) : JSON.parse(JSON.stringify(it.cards[idx]));
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
      body = common + `<label>نوع النص<select class="field" id="eLang">${[['txt', 'نص عادي'], ['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript'], ['py', 'Python']].map(([k, n]) => `<option value="${k}" ${c.lang === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>النص — ضع كل إجابة بين قوسين مزدوجين، مثل: <span class="ltr">print([[Hello]])</span><textarea class="field ltr" id="eSrc" rows="4" dir="auto">${esc(text)}</textarea></label>
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
        c.src = src; c.a = a; c.lang = $('#eLang', m.el).value;
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
  window.__dbg = { get P() { return P; }, get ME() { return ME; } };
  // رابط رمز QR: ‎#c=الكود‎ يفتح نافذة النقل والكود مكتوب فيها
  const codeFromHash = () => { const m = location.hash.match(/#c=(\d{16})/); if (!m) return; history.replaceState(null, '', location.pathname + location.search); askTransfer(m[1].replace(/(\d{4})(?=\d)/g, '$1-')); };
  // لوحة المعلم مخفية عن الطلبة: تُفتح بالرابط ‎#teacher‎ أو بالاختصار Ctrl+Alt+T
  const teacherFromHash = () => { if (location.hash !== '#teacher') return; history.replaceState(null, '', location.pathname + location.search); teacherLogin(); };
  document.addEventListener('keydown', e => { if (e.ctrlKey && e.altKey && e.code === 'KeyT') { e.preventDefault(); teacherLogin(); } });
  loadDB().then(loadCustom).then(renderLogin).then(codeFromHash).then(teacherFromHash);
  addEventListener('hashchange', () => { codeFromHash(); teacherFromHash(); });
})();
