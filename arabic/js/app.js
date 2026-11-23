/* أبطال الضاد — ألعاب تعليمية لمنهج اللغة العربية (الصفوف 1–6) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NATIVE = window.native || null;
  const STORE = 'dhad';
  const APP_NAME = 'أبطال الضاد';
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const strip = s => String(s).replace(/[ً-ْـ]/g, '');
  const GRADE = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];

  // ====================== التخزين ======================
  let DB = { students: {}, sound: true };
  let ME = null;
  // تعديلات المعلمين: الخطة المعدّلة + المحتوى المعدّل + الإعدادات (ملف موقّع)
  let CUSTOM = { settings: {}, plan: null, content: {} };
  const SET = () => ({ school: 'مدرسة أبوصيبع الابتدائية للبنين', ...CUSTOM.settings });
  const SIGN_KEY = 'joYVUsLTG4w8YXqP5w6rD5BJDFBCa0S9';
  const RECOVERY = { salt: '500c54b41929d8ee785cbde1f339821f', hash: '4ac9bfabc2a4b66662bba68bb8b8ded23663aae1f5c821991e1b5b8665fe300b' };
  const enc = new TextEncoder();
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  const unhex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
  async function pbkdf2(pw, saltHex) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: 150000 }, k, 256));
  }
  async function sign(text) {
    const k = await crypto.subtle.importKey('raw', enc.encode(SIGN_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
  }
  const sigText = c => JSON.stringify({ settings: c.settings, plan: c.plan, content: c.content });
  const hasPass = () => !!(CUSTOM.settings.pass && CUSTOM.settings.pass.hash);
  const checkPass = async pw => hasPass() && await pbkdf2(pw, CUSTOM.settings.pass.salt) === CUSTOM.settings.pass.hash;
  const checkRecovery = async k => await pbkdf2(k.toUpperCase().replace(/[^0-9A-Z]/g, ''), RECOVERY.salt) === RECOVERY.hash;
  async function setPass(pw) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); CUSTOM.settings.pass = { salt, hash: await pbkdf2(pw, salt) }; await saveCustom(); }
  const passError = pw => pw.length < 8 || !/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw) ? 'كلمة المرور يجب أن تكون <b>8 خانات على الأقل</b> وفيها <b>حروف وأرقام</b>.' : '';
  async function readCustom() {
    if (NATIVE) return NATIVE.loadCustom();
    try { const loc = localStorage.getItem(STORE + '-custom'); if (loc) return JSON.parse(loc); } catch (e) {}
    if (location.protocol !== 'file:') try { const r = await fetch('custom.json', { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch (e) {}
    return null;
  }
  async function loadCustom() {
    try {
      const d = await readCustom();
      if (d) { const c = { settings: d.settings || {}, plan: d.plan || null, content: d.content || {} };
        if (d.sig && d.sig === await sign(sigText(c))) CUSTOM = c; }
    } catch (e) {}
  }
  async function saveCustom() {
    try { const out = { ...CUSTOM, sig: await sign(sigText(CUSTOM)) };
      if (NATIVE) await NATIVE.saveCustom(out); else localStorage.setItem(STORE + '-custom', JSON.stringify(out));
    } catch (e) { toast('❌ تعذّر حفظ التعديلات'); }
  }
  function loadDB() { try { const d = NATIVE ? null : JSON.parse(localStorage.getItem(STORE) || 'null'); if (d && d.students) DB = d; } catch (e) {} }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {} }

  // ====================== الخطة والمحتوى ======================
  const PLANX = () => CUSTOM.plan || window.PLAN;
  const gradeOf = g => PLANX().grades.find(x => x.g === g);
  const itemsOf = id => CUSTOM.content[id] !== undefined ? CUSTOM.content[id] : (window.CONTENT[id] || []);
  const allLessons = () => PLANX().grades.flatMap(gr => gr.units.flatMap(u => u.lessons.map(l => ({ ...l, g: gr.g, unit: u.title }))));
  const KIND = { letter: ['🔤', 'حرف'], grammar: ['🧩', 'قواعد'], spelling: ['✍️', 'إملاء'], reading: ['📖', 'قراءة'], poem: ['🎵', 'نص شعري'], listening: ['🎧', 'استماع'],
    writing: ['📝', 'إنتاج كتابي'], hand: ['🖋️', 'خطّ'], speaking: ['🗣️', 'تحدّث'], review: ['🏆', 'مراجعة'], ready: ['🎒', 'تهيئة'] };

  // ====================== أدوات ======================
  let voice = null;
  const pickVoice = () => { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /^ar/i.test(v.lang)) || null; };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  function say(t, onend) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/[_{}]/g, ' ')); u.lang = 'ar-SA'; u.rate = .85; if (voice) u.voice = voice; if (onend) u.onend = u.onerror = onend; speechSynthesis.speak(u); } catch (e) { if (onend) onend(); }
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-say]'); if (t) { e.stopPropagation(); say(t.dataset.say); } }, true);
  const sayBtn = t => `<button class="say" data-say="${esc(t)}" title="استمع">🔊</button>`;
  let actx = null;
  function beep(kind) {
    if (!DB.sound) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [[660, .08], [880, .12]], bad: [[220, .18]], win: [[523, .1], [659, .1], [784, .1], [1046, .25]], tap: [[500, .03]] }[kind];
      let t = actx.currentTime;
      for (const [f, d] of seq) { const o = actx.createOscillator(), gn = actx.createGain(); o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        gn.gain.setValueAtTime(.12, t); gn.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + d); t += d * .9; }
    } catch (e) {}
  }
  function confetti() { const em = ['🎉', '⭐', '🎊', '✨', '🏆']; for (let i = 0; i < 36; i++) { const s = document.createElement('div'); s.className = 'confetti'; s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + 'vw'; s.style.animationDuration = 2 + Math.random() * 2 + 's'; document.body.appendChild(s); setTimeout(() => s.remove(), 4500); } }
  function modal(html, cls = '') { const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="modal ${cls}">${html}</div>`; $('#modalRoot').appendChild(bg); return { el: bg, close: () => bg.remove() }; }
  function toast(msg) { const m = modal(`<p style="font-size:19px">${msg}</p><button class="btn">حسناً</button>`); $('button', m.el).onclick = m.close; }
  const confirmBox = (msg, yes = 'نعم') => new Promise(res => { const m = modal(`<p style="font-size:19px">${msg}</p><div class="row"><button class="btn bad" data-y>${yes}</button><button class="btn ghost" data-n>إلغاء</button></div>`);
    $('[data-y]', m.el).onclick = () => { m.close(); res(true); }; $('[data-n]', m.el).onclick = () => { m.close(); res(false); }; });
  const show = id => { $$('.screen').forEach(e => e.classList.add('hidden')); $('#' + id).classList.remove('hidden'); };

  // ====================== شاشة الدخول ======================
  function renderLogin() {
    ME = null;
    const list = Object.values(DB.students).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    $('#login').innerHTML = `<div class="login-box">
      <div class="hero"><img class="hero-logo" src="img/logo.webp" alt="أبطال الضاد"><div><h1>${APP_NAME}</h1><p>العب وتعلّم لغتك العربيّة… وكن بطلًا من أبطال الضاد! 🦸‍♂️</p></div></div>
      ${list.length ? `<h3>👋 اختر اسمك</h3><div class="students">${list.map(s => `<button class="stu" data-id="${s.id}"><span class="av">${esc(s.name.trim()[0] || '؟')}</span><b>${esc(s.name)}</b><small>الصف ${GRADE[s.grade]} · ⭐ ${stars(s)}</small></button>`).join('')}</div>` : ''}
      ${window.CLASS ? `<button class="btn class-entry" id="classBtn">🎪 وضع الصف <small>للعرض على السبّورة: فرق، حكاية، موسيقى</small></button>` : ''}
      <div class="new-stu"><h3>✨ بطل جديد؟ اكتب اسمك واختر صفّك</h3>
        <input class="field" id="nName" placeholder="اسمك" maxlength="40">
        <div class="grades">${[1, 2, 3, 4, 5, 6].map(g => `<button class="gbtn" data-g="${g}">الصف<br><b>${GRADE[g]}</b></button>`).join('')}</div></div>
      <div class="school">${esc(SET().school)}</div>
      <div class="dev-credit">فكرة وتطوير: أستاذ جهاد الدمستاني <a href="#" id="igLink" class="ig" dir="ltr"><img src="instagram.png" alt=""><span>@jehadmstani</span></a></div></div>`;
    $$('.stu').forEach(b => b.onclick = () => enter(DB.students[b.dataset.id]));
    $$('.gbtn').forEach(b => b.onclick = () => {
      const name = $('#nName').value.replace(/\s+/g, ' ').trim();
      if (name.length < 2) { beep('bad'); $('#nName').focus(); return toast('✏️ اكتب اسمك أولاً'); }
      const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      DB.students[id] = { id, name, grade: +b.dataset.g, stars: {}, best: {}, created: new Date().toISOString() }; save(); enter(DB.students[id]);
    });
    if (window.CLASS) $('#classBtn').onclick = () => window.CLASS.open();
    $('#igLink').onclick = e => { e.preventDefault(); const u = 'https://www.instagram.com/jehadmstani/'; NATIVE ? NATIVE.openURL(u) : window.open(u); };
    show('login');
  }
  const stars = s => Object.values(s.stars || {}).reduce((a, b) => a + b, 0);
  function enter(s) { ME = s; s.last = new Date().toISOString(); save(); renderHome(); }

  // ====================== خريطة الصف ======================
  function renderHome() {
    const s = ME, gr = gradeOf(s.grade);
    $('#home').innerHTML = `<div class="topbar"><span class="av">${esc(s.name.trim()[0])}</span><div class="who"><b>${esc(s.name)}</b><small>الصف ${GRADE[s.grade]}</small></div>
      <span class="spacer"></span><span class="pill">⭐ ${stars(s)}</span>
      <button class="btn ghost sm" id="gradeBtn">🔄 تغيير الصف</button><button class="iconbtn" id="sndBtn">${DB.sound ? '🔊' : '🔇'}</button><button class="iconbtn" id="outBtn" title="خروج">🚪</button></div>
      <div class="map"><p class="book">📚 ${esc(gr ? gr.book : '')} — ${esc(PLANX().term)} ${esc(PLANX().year)}</p>
      ${(() => { // للطلبة: تظهر فقط الدروس التي فيها أسئلة، وتُخفى الوحدات الفارغة
        const units = gr ? gr.units.map(u => ({ u, ls: u.lessons.filter(l => itemsOf(l.id).length) })).filter(x => x.ls.length) : [];
        return units.length ? units.map(({ u, ls }) => `<section class="unit"><h2>${esc(u.title)}</h2><div class="lessons">${ls.map(l => {
        const k = KIND[l.kind] || ['📘', ''], st = s.stars[l.id] || 0;
        return `<button class="lesson" data-id="${l.id}"><span class="ic">${k[0]}</span><span class="t">${esc(l.title)}</span>
          <span class="meta"><span class="stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span></span></button>`; }).join('')}</div></section>`).join('')
          : '<p class="no-lessons">⏳ لم تُضف دروس هذا الصف بعد. جرّب لاحقًا أو اسأل معلّمك.</p>'; })()}</div>`;
    $$('.lesson').forEach(b => b.onclick = () => openLesson(allLessons().find(x => x.id === b.dataset.id)));
    $('#gradeBtn').onclick = () => { const m = modal(`<h3>اختر صفّك</h3><div class="grades">${[1, 2, 3, 4, 5, 6].map(g => `<button class="gbtn ${g === s.grade ? 'on' : ''}" data-g="${g}">الصف<br><b>${GRADE[g]}</b></button>`).join('')}</div><button class="btn ghost" data-x>إلغاء</button>`);
      $$('.gbtn', m.el).forEach(b => b.onclick = () => { s.grade = +b.dataset.g; save(); m.close(); renderHome(); }); $('[data-x]', m.el).onclick = m.close; };
    $('#sndBtn').onclick = () => { DB.sound = !DB.sound; save(); renderHome(); };
    $('#outBtn').onclick = renderLogin;
    show('home');
  }

  // ====================== اختيار اللعبة ======================
  // كل لعبة تأخذ ما يناسبها من عناصر الدرس
  const words = items => [...new Set(items.flatMap(it => it.t === 'pair' ? it.pairs.map(p => p[1]) : it.t === 'sort' ? it.items.map(x => x[0]) : it.t === 'order' && it.sep === '' ? [it.parts.join('')] : [])
    .map(w => strip(w).replace(/[^ء-ي]/g, '')).filter(w => w.length >= 2 && w.length <= 7))];
  const speedQs = items => items.flatMap(it => {
    if (it.t === 'mcq') return [{ q: it.q, options: it.options, a: it.a }];
    if (it.t === 'pair') return it.pairs.map(([a, b]) => ({ q: `${it.q} «${a}»`, options: [b, ...shuffle(it.pairs.filter(p => p[1] !== b)).slice(0, 2).map(p => p[1])], a: 0 }));
    if (it.t === 'sort') return it.items.map(([t, bi]) => ({ q: `«${t}»`, options: it.bins, a: bi, sub: it.q }));
    if (it.t === 'fill') return [{ q: `${it.q} ${it.text.replace(/\{\{\d+\}\}/g, '____')}`, options: [...new Set(it.tokens)], a: [...new Set(it.tokens)].indexOf(it.a[0]), single: it.a.length === 1 }].filter(x => x.single);
    return [];
  });
  function openLesson(l) {
    const items = itemsOf(l.id), pairs = items.filter(x => x.t === 'pair').flatMap(x => x.pairs);
    const games = [
      ['adventure', '🗺️', 'مغامرة الدرس', 'كل أسئلة الدرس واحدًا تلو الآخر، واجمع النجوم', true],
      ['speed', '⚡', 'تحدّي السرعة', 'أجب عن أكبر عدد من الأسئلة في 60 ثانية', speedQs(items).length >= 4],
      ['memory', '🧠', 'بطاقات الذاكرة', 'اقلب البطاقات وطابق كل زوج', pairs.length >= 3],
      ['search', '🔎', 'البحث عن الكلمات', 'ابحث عن الكلمات المختبئة في الشبكة', words(items).length >= 4],
    ].filter(g => g[4]);
    const m = modal(`<div class="row" style="justify-content:space-between"><h2 style="margin:0">${(KIND[l.kind] || ['📘'])[0]} ${esc(l.title)}</h2><button class="iconbtn" data-x>✖</button></div>
      ${l.note ? `<p class="muted">${esc(l.note)}</p>` : ''}
      <div class="games">${games.map(g => `<button class="game" data-g="${g[0]}"><span class="gi">${g[1]}</span><b>${g[2]}</b><small>${g[3]}</small>${ME.best[l.id + ':' + g[0]] ? `<span class="best">🏅 أفضل: ${ME.best[l.id + ':' + g[0]]}</span>` : ''}</button>`).join('')}</div>`, 'wide');
    $('[data-x]', m.el).onclick = m.close;
    $$('.game', m.el).forEach(b => b.onclick = () => { m.close(); GAME[b.dataset.g](l, items); });
  }
  const GAME = {};
  function finish(l, mode, score, starsN, msg) {
    const key = l.id + ':' + mode;
    if (ME) { if (score > (ME.best[key] || 0)) ME.best[key] = score; if (starsN && starsN > (ME.stars[l.id] || 0)) ME.stars[l.id] = starsN; save(); }
    beep('win'); confetti();
    const m = modal(`<div class="big">${starsN ? '⭐'.repeat(starsN) : '🏅'}</div><h2>${msg}</h2>
      <div class="row"><button class="btn" data-a>🔁 العب مرة أخرى</button><button class="btn ghost" data-h>العودة للدروس</button></div>`);
    $('[data-a]', m.el).onclick = () => { m.close(); GAME[mode](l, itemsOf(l.id)); };
    $('[data-h]', m.el).onclick = () => { m.close(); back(); };
  }
  const back = () => ME ? renderHome() : (window.__teacherBack ? window.__teacherBack() : renderLogin());
  function playTop(l, extra = '') {
    return `<div class="p-top"><button class="iconbtn" id="pX" title="خروج">✖</button><div class="p-title">${esc(l.title)}</div>${extra}</div>`;
  }

  // ---------- مغامرة الدرس: عرض العناصر بالتتابع ----------
  GAME.adventure = (l, items) => {
    const S = { i: 0, mistakes: 0, queue: items.map((_, i) => i), wrong: {} };
    const next = () => {
      if (S.i >= S.queue.length) { const st = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1; return finish(l, 'adventure', st, st, S.mistakes === 0 ? 'رائع! بلا أي خطأ 🏆' : 'أحسنت! أكملت المغامرة 🎉'); }
      const it = items[S.queue[S.i]];
      window.__cur = it;
      $('#player').innerHTML = playTop(l, `<div class="prog"><i style="width:${S.i / S.queue.length * 100}%"></i></div>`) + `<div class="p-body"><div class="card" id="card"></div></div><div class="p-bottom" id="pb"></div>`;
      $('#pX').onclick = back;
      RENDER[it.t]($('#card'), it, ok => {
        if (!ok && !S.wrong[S.queue[S.i]]) { S.wrong[S.queue[S.i]] = 1; S.mistakes++; S.queue.push(S.queue[S.i]); }
        $('#pb').className = 'p-bottom ' + (ok ? 'ok' : 'bad');
        $('#pb').innerHTML = `<div class="fb">${ok ? ['أحسنت! 🎉', 'رائع! 🌟', 'ممتاز يا بطل! 💪', 'صحيح! 👏'][Math.floor(Math.random() * 4)] : 'لا بأس! سيعود هذا السؤال في آخر المغامرة 🔁'}</div><button class="btn ${ok ? 'ok' : 'bad'}" id="nx">متابعة ←</button>`;
        $('#nx').onclick = () => { S.i++; next(); }; $('#nx').focus();
      });
      if (ME && ME.grade <= 2) say(it.q);
    };
    show('player'); next();
  };
  // العارضات: كل واحدة تستدعي done(صحيح؟) مرة واحدة
  const RENDER = {};
  const qHead = it => `<div class="q">${esc(it.q)} ${sayBtn(it.q)}</div>`;
  RENDER.mcq = (el, it, done) => {
    const order = shuffle(it.options.map((_, i) => i));
    el.innerHTML = qHead(it) + `<div class="opts">${order.map(i => `<button class="opt" data-i="${i}">${esc(it.options[i])}</button>`).join('')}</div>`;
    $$('.opt', el).forEach(b => b.onclick = () => { if (el.dataset.lock) return; el.dataset.lock = 1; const ok = +b.dataset.i === it.a;
      b.classList.add(ok ? 'right' : 'wrong'); if (!ok) $(`.opt[data-i="${it.a}"]`, el).classList.add('right'); beep(ok ? 'ok' : 'bad'); done(ok); });
  };
  RENDER.fill = (el, it, done) => {
    const ans = Array(it.a.length).fill(null), toks = shuffle(it.tokens.map((t, k) => ({ t, k })));
    const draw = () => { $('.sent', el).innerHTML = esc(it.text).replace(/\{\{(\d+)\}\}/g, (_, i) => `<span class="blank ${ans[i] !== null ? 'filled' : ''}" data-b="${i}">${ans[i] !== null ? esc(it.tokens[ans[i]]) : ''}</span>`);
      $$('.blank', el).forEach(b => b.onclick = () => { if (el.dataset.lock) return; ans[+b.dataset.b] = null; draw(); });
      $$('.tok', el).forEach(t => t.classList.toggle('used', ans.includes(+t.dataset.k))); };
    el.innerHTML = qHead(it) + `<div class="sent"></div><div class="tokens">${toks.map(o => `<button class="tok" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>`;
    $$('.tok', el).forEach(t => t.onclick = () => { if (el.dataset.lock || ans.includes(+t.dataset.k)) return; const i = ans.indexOf(null); if (i < 0) return; ans[i] = +t.dataset.k; beep('tap'); draw();
      if (!ans.includes(null)) { el.dataset.lock = 1; const ok = ans.every((k, i) => it.tokens[k] === it.a[i]); $$('.blank', el).forEach((b, i) => b.classList.add(it.tokens[ans[i]] === it.a[i] ? 'right' : 'wrong'));
        if (!ok) $('.sent', el).insertAdjacentHTML('afterend', `<div class="answer">الإجابة: ${esc(it.text.replace(/\{\{(\d+)\}\}/g, (_, i) => it.a[i]))}</div>`); beep(ok ? 'ok' : 'bad'); done(ok); } });
    draw();
  };
  RENDER.order = (el, it, done) => {
    const picked = [], pool = shuffle(it.parts.map((t, k) => ({ t, k })));
    if (pool.every((o, i) => o.k === i) && pool.length > 1) pool.reverse();
    const sep = it.sep ?? ' ';
    const draw = () => { $('.built', el).innerHTML = picked.length ? picked.map(k => `<button class="tok on" data-p="${k}">${esc(it.parts[k])}</button>`).join('') : '<span class="muted">اضغط القطع بالترتيب الصحيح</span>';
      $('.preview', el).textContent = picked.map(k => it.parts[k]).join(sep);
      $$('[data-p]', el).forEach(b => b.onclick = () => { if (el.dataset.lock) return; picked.splice(picked.indexOf(+b.dataset.p), 1); draw(); });
      $$('.pool .tok', el).forEach(t => t.classList.toggle('used', picked.includes(+t.dataset.k))); };
    el.innerHTML = qHead(it) + `<div class="built"></div><div class="preview"></div><div class="tokens pool">${pool.map(o => `<button class="tok" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>`;
    $$('.pool .tok', el).forEach(t => t.onclick = () => { if (el.dataset.lock || picked.includes(+t.dataset.k)) return; picked.push(+t.dataset.k); beep('tap'); draw();
      if (picked.length === it.parts.length) { el.dataset.lock = 1; const got = picked.map(k => it.parts[k]).join(sep), want = it.parts.join(sep), ok = got === want;
        $('.preview', el).classList.add(ok ? 'right' : 'wrong'); if (!ok) $('.preview', el).insertAdjacentHTML('afterend', `<div class="answer">الصحيح: ${esc(want)}</div>`); beep(ok ? 'ok' : 'bad'); done(ok); } });
    draw();
  };
  RENDER.sort = (el, it, done) => {
    const rest = shuffle(it.items.map((x, i) => i)); let errs = 0, cur = null;
    el.innerHTML = qHead(it) + `<div class="sort-pool"></div><div class="bins">${it.bins.map((b, i) => `<button class="bin" data-b="${i}"><b>${esc(b)}</b><div class="in"></div></button>`).join('')}</div>`;
    const drawPool = () => { cur = rest[0]; $('.sort-pool', el).innerHTML = cur === undefined ? '' : `<div class="chip big">${esc(it.items[cur][0])}</div><small class="muted">إلى أيّ صندوق؟ (${rest.length} متبقّية)</small>`; };
    $$('.bin', el).forEach(b => b.onclick = () => { if (cur === undefined || el.dataset.lock) return; const bi = +b.dataset.b, ok = it.items[cur][1] === bi;
      if (!ok) { errs++; beep('bad'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; }
      beep('ok'); $(`.bin[data-b="${bi}"] .in`, el).insertAdjacentHTML('beforeend', `<span class="chip">${esc(it.items[cur][0])}</span>`); rest.shift(); drawPool();
      if (!rest.length) { el.dataset.lock = 1; done(errs === 0); } });
    drawPool();
  };
  RENDER.pair = (el, it, done) => {
    const L = shuffle(it.pairs.map((p, i) => i)), R = shuffle(it.pairs.map((p, i) => i)); let sel = null, errs = 0, left = it.pairs.length;
    el.innerHTML = qHead(it) + `<div class="match"><div class="col">${L.map(i => `<button class="mi" data-s="a" data-i="${i}">${esc(it.pairs[i][0])}</button>`).join('')}</div>
      <div class="col">${R.map(i => `<button class="mi" data-s="b" data-i="${i}">${esc(it.pairs[i][1])}</button>`).join('')}</div></div>`;
    $$('.mi', el).forEach(b => b.onclick = () => { if (b.classList.contains('done') || el.dataset.lock) return;
      if (!sel || sel.dataset.s === b.dataset.s) { $$('.mi.sel', el).forEach(x => x.classList.remove('sel')); sel = b; b.classList.add('sel'); return; }
      if (sel.dataset.i === b.dataset.i) { beep('ok'); [sel, b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); }); sel = null; if (!--left) { el.dataset.lock = 1; done(errs === 0); } }
      else { errs++; beep('bad'); [sel, b].forEach(x => { x.classList.add('shake'); setTimeout(() => x.classList.remove('shake', 'sel'), 400); }); sel = null; } });
  };

  // ---------- تحدّي السرعة ----------
  GAME.speed = (l, items) => {
    const qs = speedQs(items); let pool = shuffle(qs), score = 0, combo = 0, t = 60, timer = null, cur = null;
    const draw = () => {
      if (!pool.length) pool = shuffle(qs);
      cur = pool.pop(); const order = shuffle(cur.options.map((_, i) => i));
      $('#card').innerHTML = `${cur.sub ? `<div class="muted">${esc(cur.sub)}</div>` : ''}<div class="q">${esc(cur.q)}</div><div class="opts">${order.map(i => `<button class="opt" data-i="${i}">${esc(cur.options[i])}</button>`).join('')}</div>`;
      $$('#card .opt').forEach(b => b.onclick = () => { const ok = +b.dataset.i === cur.a;
        if (ok) { combo++; score += 10 * Math.min(combo, 5); beep('ok'); } else { combo = 0; t = Math.max(0, t - 3); beep('bad'); }
        b.classList.add(ok ? 'right' : 'wrong'); hud(); setTimeout(draw, ok ? 250 : 600); $$('#card .opt').forEach(x => x.onclick = null); });
    };
    const hud = () => { $('#hud').innerHTML = `<span class="pill">⏱️ ${t}</span><span class="pill">🏅 ${score}</span>${combo >= 2 ? `<span class="pill combo">🔥 ×${Math.min(combo, 5)}</span>` : ''}`; };
    $('#player').innerHTML = playTop(l, '<div id="hud" class="hud"></div>') + '<div class="p-body"><div class="card" id="card"></div></div><p class="muted center">كل إجابة صحيحة متتالية تضاعف نقاطك 🔥 — والخطأ يخصم 3 ثوانٍ</p>';
    $('#pX').onclick = () => { clearInterval(timer); back(); };
    show('player'); hud(); draw();
    timer = setInterval(() => { t--; hud(); if (t <= 0) { clearInterval(timer); finish(l, 'speed', score, 0, `انتهى الوقت! نقاطك: ${score}`); } }, 1000);
  };

  // ---------- بطاقات الذاكرة ----------
  GAME.memory = (l, items) => {
    const pairs = shuffle(items.filter(x => x.t === 'pair').flatMap(x => x.pairs)).slice(0, 6);
    const cards = shuffle(pairs.flatMap((p, i) => [{ t: p[0], i }, { t: p[1], i }]));
    let open = [], moves = 0, found = 0, busy = false;
    $('#player').innerHTML = playTop(l, '<div id="hud" class="hud"></div>') + `<div class="p-body"><div class="mem" style="--cols:${cards.length > 8 ? 4 : 4}">${cards.map((c, k) => `<button class="mc" data-k="${k}"><span class="front">${esc(c.t)}</span><span class="backf">؟</span></button>`).join('')}</div></div>`;
    const hud = () => { $('#hud').innerHTML = `<span class="pill">🔁 ${moves} محاولة</span><span class="pill">✅ ${found}/${pairs.length}</span>`; };
    $('#pX').onclick = back;
    $$('.mc').forEach(b => b.onclick = () => { const k = +b.dataset.k; if (busy || b.classList.contains('flip')) return; b.classList.add('flip'); beep('tap'); open.push(k);
      if (open.length === 2) { moves++; const [a, c] = open; open = [];
        if (cards[a].i === cards[c].i) { found++; beep('ok'); $$(`.mc[data-k="${a}"],.mc[data-k="${c}"]`).forEach(x => x.classList.add('done'));
          if (found === pairs.length) { const st = moves <= pairs.length + 2 ? 3 : moves <= pairs.length * 2 ? 2 : 1; setTimeout(() => finish(l, 'memory', Math.max(10, 100 - (moves - pairs.length) * 5), st, `أنهيتها في ${moves} محاولة!`), 500); } }
        else { busy = true; setTimeout(() => { $$(`.mc[data-k="${a}"],.mc[data-k="${c}"]`).forEach(x => x.classList.remove('flip')); busy = false; }, 900); } }
      hud(); });
    show('player'); hud();
  };

  // ---------- البحث عن الكلمات ----------
  GAME.search = (l, items) => {
    const list = shuffle(words(items)).slice(0, 6), N = Math.max(7, Math.max(...list.map(w => w.length)) + 1);
    const grid = Array.from({ length: N }, () => Array(N).fill(null)), dirs = [[0, -1], [1, 0], [1, -1]], placed = [];
    for (const w of list) for (let tries = 0; tries < 200; tries++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)], r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
      const cells = [...w].map((ch, i) => [r + dr * i, c + dc * i]);
      if (cells.every(([y, x]) => y >= 0 && y < N && x >= 0 && x < N && (grid[y][x] === null || grid[y][x] === w[cells.findIndex(q => q[0] === y && q[1] === x)]))) {
        cells.forEach(([y, x], i) => grid[y][x] = w[i]); placed.push({ w, cells }); break; }
    }
    const AB = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
    for (const row of grid) for (let x = 0; x < N; x++) if (row[x] === null) row[x] = AB[Math.floor(Math.random() * AB.length)];
    let start = null, found = new Set(), t0 = Date.now();
    $('#player').innerHTML = playTop(l) + `<div class="p-body"><div class="ws-words">${placed.map(p => `<span class="chip" data-w="${p.w}">${p.w}</span>`).join('')}</div>
      <div class="ws" style="--n:${N}">${grid.map((row, y) => row.map((ch, x) => `<button class="wc" data-y="${y}" data-x="${x}">${ch}</button>`).join('')).join('')}</div>
      <p class="muted center">اضغط أول حرف في الكلمة ثم آخر حرف فيها</p></div>`;
    $('#pX').onclick = back;
    $$('.wc').forEach(b => b.onclick = () => { const y = +b.dataset.y, x = +b.dataset.x;
      if (!start) { start = [y, x]; b.classList.add('sel'); beep('tap'); return; }
      const hit = placed.find(p => !found.has(p.w) && ((p.cells[0][0] === start[0] && p.cells[0][1] === start[1] && p.cells.at(-1)[0] === y && p.cells.at(-1)[1] === x) || (p.cells.at(-1)[0] === start[0] && p.cells.at(-1)[1] === start[1] && p.cells[0][0] === y && p.cells[0][1] === x)));
      $$('.wc.sel').forEach(q => q.classList.remove('sel')); start = null;
      if (!hit) return beep('bad');
      found.add(hit.w); beep('ok'); hit.cells.forEach(([yy, xx]) => $(`.wc[data-y="${yy}"][data-x="${xx}"]`).classList.add('found')); $(`[data-w="${hit.w}"]`).classList.add('done');
      if (found.size === placed.length) { const sec = Math.round((Date.now() - t0) / 1000); setTimeout(() => finish(l, 'search', Math.max(10, 200 - sec), sec < 60 ? 3 : sec < 120 ? 2 : 1, `وجدت كل الكلمات في ${sec} ثانية!`), 400); } });
    show('player');
  };

  // ====================== لوحة المعلم ======================
  let FAILS = 0, LOCK = 0;
  function teacherLogin() {
    if (!hasPass()) return setupPass();
    const m = modal(`<h2>🔒 لوحة المعلم</h2><input type="password" class="field ltr" id="pin" style="text-align:center;width:260px"><p class="warn" id="pMsg"></p>
      <div class="row"><button class="btn" data-ok>دخول</button><button class="btn ghost" data-x>إلغاء</button></div><p><a href="#" id="forgot" class="muted">نسيت كلمة المرور؟</a></p>`);
    const go = async () => { if (Date.now() < LOCK) return $('#pMsg', m.el).textContent = '⏳ انتظر قليلاً ثم حاول.';
      if (await checkPass($('#pin', m.el).value)) { FAILS = 0; m.close(); return teacherPanel(); }
      FAILS++; if (FAILS >= 5) LOCK = Date.now() + 60000 * 2 ** Math.min(FAILS - 5, 4); beep('bad'); $('#pMsg', m.el).textContent = `كلمة مرور خاطئة (${FAILS})`; $('#pin', m.el).value = ''; };
    $('[data-ok]', m.el).onclick = go; $('#pin', m.el).onkeydown = e => { if (e.key === 'Enter') go(); }; $('[data-x]', m.el).onclick = m.close;
    $('#forgot', m.el).onclick = e => { e.preventDefault(); m.close(); setupPass(true); }; setTimeout(() => $('#pin', m.el).focus(), 50);
  }
  function setupPass(forgot) {
    const m = modal(`<h2>🔑 ${forgot ? 'استعادة كلمة المرور' : 'إنشاء كلمة مرور للوحة المعلم'}</h2><p class="muted">أدخل <b>رمز الاسترداد</b>، ثم اختر كلمة مرور.</p>
      <div class="form"><label>رمز الاسترداد<input class="field ltr" id="rk" placeholder="XXXX-XXXX-XXXX-XXXX"></label><label>كلمة المرور<input class="field ltr" type="password" id="p1"></label><label>تأكيدها<input class="field ltr" type="password" id="p2"></label></div>
      <p class="warn" id="rMsg"></p><div class="row"><button class="btn" data-ok>حفظ</button><button class="btn ghost" data-x>إلغاء</button></div>`);
    $('[data-x]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async () => { const msg = t => $('#rMsg', m.el).innerHTML = t, p1 = $('#p1', m.el).value;
      if (Date.now() < LOCK) return msg('⏳ انتظر قليلاً.'); if (passError(p1)) return msg(passError(p1)); if (p1 !== $('#p2', m.el).value) return msg('كلمتا المرور غير متطابقتين.');
      if (!await checkRecovery($('#rk', m.el).value)) { FAILS++; if (FAILS >= 5) LOCK = Date.now() + 60000; return msg('رمز الاسترداد غير صحيح.'); }
      await setPass(p1); m.close(); teacherPanel(); };
  }
  const TAB = {};
  let T = { g: 1, lesson: null };
  function teacherPanel(tab = 'plan') {
    $('#modalRoot').innerHTML = '';
    const m = modal(`<div class="row" style="justify-content:space-between"><h2 style="margin:0">👨‍🏫 لوحة المعلم — ${APP_NAME}</h2><button class="iconbtn" data-x>✖</button></div>
      <div class="tabs">${[['plan', '📅 الخطط'], ['content', '📝 المحتوى والأسئلة'], ['orphans', '🔗 محتوى غير مربوط'], ['data', '📤 تصدير / استيراد'], ['settings', '⚙️ الإعدادات']].map(([k, t]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>
      <div id="tBody"></div>`, 'xwide');
    $('[data-x]', m.el).onclick = m.close;
    $$('[data-tab]', m.el).forEach(b => b.onclick = () => teacherPanel(b.dataset.tab));
    TAB[tab]($('#tBody', m.el));
  }
  const gradeTabs = () => `<div class="tabs sm">${[1, 2, 3, 4, 5, 6].map(g => `<button class="tab ${g === T.g ? 'on' : ''}" data-tg="${g}">الصف ${GRADE[g]}</button>`).join('')}</div>`;
  const bindGrades = (el, again) => $$('[data-tg]', el).forEach(b => b.onclick = () => { T.g = +b.dataset.tg; T.lesson = null; again(el); });
  const editablePlan = () => { if (!CUSTOM.plan) CUSTOM.plan = JSON.parse(JSON.stringify(window.PLAN)); return CUSTOM.plan; };
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---- الخطط: تعديل الوحدات والدروس (تتغيّر سنويًا) ----
  TAB.plan = el => {
    const P = PLANX(), gr = P.grades.find(x => x.g === T.g);
    el.innerHTML = `<p class="muted">عدّل خطة كل صف: أضف وحدة أو درسًا، غيّر العناوين ونوع الدرس، رتّب أو احذف. المحتوى يبقى مربوطًا بالدرس حتى لو غيّرت عنوانه. التعديلات تُحفظ مباشرة على هذا الجهاز، وتصل للطلبة بعد تصدير ملف التعديلات.</p>
      <div class="row" style="justify-content:flex-start"><label>العام الدراسي <input class="field sm" id="pYear" value="${esc(P.year)}"></label><label>الفصل <input class="field sm" id="pTerm" value="${esc(P.term)}"></label>
        ${CUSTOM.plan ? '<button class="btn ghost sm" id="pReset">↩️ استعادة خطة الوزارة الأصلية</button>' : ''}</div>
      ${gradeTabs()}
      <label>الكتب المقرّرة <input class="field" id="pBook" value="${esc(gr.book)}"></label>
      ${gr.units.map((u, ui) => `<div class="pu"><div class="row pu-h"><input class="field" data-ut="${ui}" value="${esc(u.title)}"><button class="iconbtn sm" data-um="${ui}:-1" title="أعلى">⬆️</button><button class="iconbtn sm" data-um="${ui}:1" title="أسفل">⬇️</button><button class="btn bad sm" data-ud="${ui}">حذف الوحدة</button></div>
        ${u.lessons.map((l, li) => `<div class="pl"><span class="cnt" title="عدد عناصر المحتوى">${itemsOf(l.id).length}</span>
          <input class="field" data-lt="${ui}:${li}" value="${esc(l.title)}">
          <select class="field sm" data-lk="${ui}:${li}">${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${k === l.kind ? 'selected' : ''}>${v[0]} ${v[1]}</option>`).join('')}</select>
          <button class="iconbtn sm" data-lm="${ui}:${li}:-1">⬆️</button><button class="iconbtn sm" data-lm="${ui}:${li}:1">⬇️</button><button class="iconbtn sm" data-ld="${ui}:${li}" title="حذف">🗑️</button></div>`).join('')}
        <button class="btn ghost sm" data-la="${ui}">➕ درس</button></div>`).join('')}
      <button class="btn" id="uAdd">➕ وحدة جديدة</button>`;
    bindGrades(el, TAB.plan);
    const edit = fn => { const g = editablePlan().grades.find(x => x.g === T.g); fn(g); saveCustom(); };
    const redraw = () => TAB.plan(el);
    $('#pYear', el).onchange = e => { editablePlan().year = e.target.value.trim(); saveCustom(); };
    $('#pTerm', el).onchange = e => { editablePlan().term = e.target.value.trim(); saveCustom(); };
    $('#pBook', el).onchange = e => edit(g => g.book = e.target.value.trim());
    if ($('#pReset', el)) $('#pReset', el).onclick = async () => { if (await confirmBox('استعادة خطة الوزارة الأصلية؟ ستُلغى كل تعديلاتك على الخطط (المحتوى المعدّل لا يُحذف).', 'استعادة')) { CUSTOM.plan = null; await saveCustom(); redraw(); } };
    $$('[data-ut]', el).forEach(i => i.onchange = () => edit(g => g.units[+i.dataset.ut].title = i.value.trim()));
    $$('[data-lt]', el).forEach(i => i.onchange = () => { const [u, l] = i.dataset.lt.split(':').map(Number); edit(g => g.units[u].lessons[l].title = i.value.trim()); });
    $$('[data-lk]', el).forEach(i => i.onchange = () => { const [u, l] = i.dataset.lk.split(':').map(Number); edit(g => g.units[u].lessons[l].kind = i.value); });
    const move = (a, i, d) => { const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
    $$('[data-um]', el).forEach(b => b.onclick = () => { const [u, d] = b.dataset.um.split(':').map(Number); edit(g => move(g.units, u, d)); redraw(); });
    $$('[data-lm]', el).forEach(b => b.onclick = () => { const [u, l, d] = b.dataset.lm.split(':').map(Number); edit(g => move(g.units[u].lessons, l, d)); redraw(); });
    $$('[data-ld]', el).forEach(b => b.onclick = async () => { const [u, l] = b.dataset.ld.split(':').map(Number), les = gradeOf(T.g).units[u].lessons[l];
      if (await confirmBox(`حذف الدرس «${esc(les.title)}» من الخطة؟${itemsOf(les.id).length ? '<br><span class="muted">محتواه لن يُحذف، وسيظهر في «محتوى غير مربوط» لتربطه بدرس آخر.</span>' : ''}`, 'حذف')) { edit(g => g.units[u].lessons.splice(l, 1)); redraw(); } });
    $$('[data-ud]', el).forEach(b => b.onclick = async () => { const u = +b.dataset.ud; if (await confirmBox('حذف الوحدة بكل دروسها من الخطة؟ (المحتوى يبقى في «غير مربوط»)', 'حذف')) { edit(g => g.units.splice(u, 1)); redraw(); } });
    $$('[data-la]', el).forEach(b => b.onclick = () => { edit(g => g.units[+b.dataset.la].lessons.push({ id: newId('L'), title: 'درس جديد', kind: 'grammar' })); redraw(); });
    $('#uAdd', el).onclick = () => { edit(g => g.units.push({ id: newId('U'), title: 'وحدة جديدة', lessons: [] })); redraw(); };
  };

  // ---- المحتوى: نص بسيط لكل درس (سطر لكل سؤال) — سهل للمعلم وللذكاء الاصطناعي ----
  const FORMAT_HELP = `<div class="help"><b>صيغة الكتابة: سطر لكل سؤال</b> (اكتب نوع السؤال ثم نقطتين):<br>
    <code>اختيار: السؤال؟ = الإجابة الصحيحة | خطأ | خطأ</code><br>
    <code>أزواج: صِل المفرد بجمعه = كتاب: كتب | قلم: أقلام | شجرة: أشجار</code><br>
    <code>تصنيف: صنّف الكلمات = مذكّر: معلّم، قمر، أسد | مؤنّث: حديقة، شمس</code><br>
    <code>ترتيب: رتّب الكلمات = يحبُّ الطالبُ مدرستَه</code> (كلمات بالترتيب الصحيح) · <code>حروف: رتّب الحروف = باب</code><br>
    <code>فراغ: اختر الكلمة المناسبة = ذهبَ أحمدُ [إلى] المدرسة | من | على</code> (الإجابة بين قوسين، والتمويه بعد |)<br>
    يمكن إضافة صورة رمزية (إيموجي) داخل أي نص 🐄</div>`;
  const toText = items => items.map(it => {
    if (it.t === 'mcq') return `اختيار: ${it.q} = ${[it.options[it.a], ...it.options.filter((_, i) => i !== it.a)].join(' | ')}`;
    if (it.t === 'pair') return `أزواج: ${it.q} = ${it.pairs.map(p => p.join(': ')).join(' | ')}`;
    if (it.t === 'sort') return `تصنيف: ${it.q} = ${it.bins.map((b, i) => `${b}: ${it.items.filter(x => x[1] === i).map(x => x[0]).join('، ')}`).join(' | ')}`;
    if (it.t === 'order') return it.sep === '' ? `حروف: ${it.q} = ${it.parts.join('')}` : `ترتيب: ${it.q} = ${it.parts.join(' ')}`;
    if (it.t === 'fill') { const extra = it.tokens.slice(); it.a.forEach(a => { const k = extra.indexOf(a); if (k >= 0) extra.splice(k, 1); });
      return `فراغ: ${it.q} = ${it.text.replace(/\{\{(\d+)\}\}/g, (_, i) => `[${it.a[i]}]`)}${extra.length ? ' | ' + extra.join(' | ') : ''}`; }
    return '';
  }).join('\n');
  function fromText(txt) {
    const items = [], errors = [];
    txt.split('\n').map(s => s.trim()).forEach((line, n) => {
      if (!line) return;
      const m = line.match(/^(اختيار|أزواج|تصنيف|ترتيب|حروف|فراغ)\s*:\s*(.+?)\s*=\s*(.+)$/);
      const err = e => errors.push(`السطر ${n + 1}: ${e}`);
      if (!m) return err('ابدأ بنوع السؤال (اختيار، أزواج، تصنيف، ترتيب، حروف، فراغ) ثم «:» والسؤال ثم «=»');
      const [, type, q, body] = m, parts = body.split('|').map(s => s.trim()).filter(Boolean);
      if (type === 'اختيار') { if (parts.length < 2) return err('اكتب الإجابة الصحيحة وخيارًا خاطئًا واحدًا على الأقل'); items.push({ t: 'mcq', q, options: parts, a: 0 }); }
      else if (type === 'أزواج') { const pairs = parts.map(p => p.split(/\s*:\s*/)); if (pairs.length < 2 || pairs.some(p => p.length !== 2 || !p[0] || !p[1])) return err('كل زوج بالشكل «أ: ب»، وزوجان على الأقل'); items.push({ t: 'pair', q, pairs }); }
      else if (type === 'تصنيف') { const bins = [], its = []; for (const p of parts) { const k = p.indexOf(':'); if (k < 1) return err('كل صندوق بالشكل «اسم الصندوق: كلمة، كلمة»');
          bins.push(p.slice(0, k).trim()); p.slice(k + 1).split(/[،,]/).map(s => s.trim()).filter(Boolean).forEach(w => its.push([w, bins.length - 1])); }
        if (bins.length < 2 || its.length < 2) return err('صندوقان وكلمتان على الأقل'); items.push({ t: 'sort', q, bins, items: its }); }
      else if (type === 'ترتيب') { const ws = body.split(/\s+/).filter(Boolean); if (ws.length < 2) return err('كلمتان على الأقل'); items.push({ t: 'order', q, parts: ws, sep: ' ' }); }
      else if (type === 'حروف') { const w = strip(body.replace(/\s+/g, '')); if (w.length < 2) return err('اكتب كلمة من حرفين على الأقل'); items.push({ t: 'order', q, parts: [...w], sep: '' }); }
      else if (type === 'فراغ') { const a = []; const text = parts[0].replace(/\[(.+?)\]/g, (_, x) => { a.push(x.trim()); return `{{${a.length - 1}}}`; });
        if (!a.length) return err('ضع الإجابة بين قوسين مربعين [ ]'); items.push({ t: 'fill', q, text, a, tokens: a.concat(parts.slice(1)) }); }
    });
    return { items, errors };
  }
  TAB.content = el => {
    const gr = gradeOf(T.g), ls = gr.units.flatMap(u => u.lessons.map(l => ({ ...l, unit: u.title })));
    if (!T.lesson || !ls.some(l => l.id === T.lesson)) T.lesson = (ls.find(l => itemsOf(l.id).length) || ls[0] || {}).id;
    const l = ls.find(x => x.id === T.lesson);
    el.innerHTML = gradeTabs() + (l ? `<div class="row" style="justify-content:flex-start"><label style="flex:1">الدرس
      <select class="field" id="cLes">${gr.units.map(u => `<optgroup label="${esc(u.title)}">${u.lessons.map(x => `<option value="${x.id}" ${x.id === T.lesson ? 'selected' : ''}>${itemsOf(x.id).length ? '✅' : '⬜'} ${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}</select></label></div>
      ${FORMAT_HELP}
      <textarea class="field" id="cTxt" rows="14" dir="rtl" placeholder="اكتب أسئلة الدرس هنا، أو الصق ما أنتجه الذكاء الاصطناعي…">${esc(toText(itemsOf(l.id)))}</textarea>
      <p class="warn" id="cMsg"></p>
      <div class="row" style="justify-content:flex-start"><button class="btn" id="cSave">💾 حفظ أسئلة الدرس</button><button class="btn ghost" id="cTry">▶️ جرّبها</button><button class="btn ghost" id="cAI">🤖 برومبت للذكاء الاصطناعي</button>
        ${CUSTOM.content[l.id] !== undefined && window.CONTENT[l.id] ? '<button class="btn ghost" id="cReset">↩️ إرجاع المحتوى الأصلي</button>' : ''}</div>` : '<p>لا توجد دروس في خطة هذا الصف.</p>');
    bindGrades(el, TAB.content); if (!l) return;
    $('#cLes', el).onchange = e => { T.lesson = e.target.value; TAB.content(el); };
    const parse = () => { const r = fromText($('#cTxt', el).value); $('#cMsg', el).innerHTML = r.errors.length ? '❌ ' + r.errors.slice(0, 6).map(esc).join('<br>') : ''; return r.errors.length ? null : r.items; };
    $('#cSave', el).onclick = async () => { const items = parse(); if (!items) return; CUSTOM.content[l.id] = items; await saveCustom(); toast(`✅ حُفظت ${items.length} أسئلة للدرس.<br>ليصل التعديل للطلبة صدّر ملف التعديلات.`); TAB.content(el); };
    $('#cTry', el).onclick = () => { const items = parse(); if (!items || !items.length) return; $('#modalRoot').innerHTML = ''; window.__teacherBack = () => { window.__teacherBack = null; renderLogin(); teacherPanel('content'); }; GAME.adventure(l, items); };
    $('#cAI', el).onclick = () => aiPrompt(l, gr.g);
    if ($('#cReset', el)) $('#cReset', el).onclick = async () => { if (await confirmBox('إرجاع أسئلة هذا الدرس إلى المحتوى الأصلي؟', 'إرجاع')) { delete CUSTOM.content[l.id]; await saveCustom(); TAB.content(el); } };
  };
  function aiPrompt(l, g) {
    const p = `أنت معلم لغة عربية خبير تكتب أسئلة لتطبيق ألعاب تعليمية لطلبة الصف ${GRADE[g]} الابتدائي في مملكة البحرين.
الدرس: «${l.title}»${l.note ? ` (${l.note})` : ''}.
اكتب من 8 إلى 12 سؤالًا متنوّعًا تغطّي مفهوم الدرس، بلغة فصيحة سهلة تناسب العمر، مع تشكيل الكلمات التي تحتاجه، وتأكّد من صحّة القاعدة اللغوية والإجابات.
استخدم هذه الصيغة حرفيًا: سطر لكل سؤال، بلا ترقيم ولا شرح ولا نص قبلها أو بعدها:
اختيار: السؤال؟ = الإجابة الصحيحة | خيار خاطئ | خيار خاطئ
أزواج: عنوان التوصيل = كلمة: مقابلها | كلمة: مقابلها | كلمة: مقابلها
تصنيف: عنوان التصنيف = اسم الصندوق الأول: كلمة، كلمة، كلمة | اسم الصندوق الثاني: كلمة، كلمة، كلمة
ترتيب: رتّب الكلمات لتكوّن جملة = الكلمات بالترتيب الصحيح مفصولة بمسافات
حروف: رتّب الحروف لتكوّن كلمة = الكلمة
فراغ: التعليمات = جملة فيها [الإجابة] بين قوسين مربعين | كلمة تمويه | كلمة تمويه
قواعد: الإجابة الصحيحة في «اختيار» تُكتب أولًا دائمًا. نوّع بين الأنواع، واجعل في كل درس سطرًا واحدًا على الأقل من «أزواج» (4 أزواج) لتعمل لعبة الذاكرة.`;
    const m = modal(`<h2>🤖 برومبت للذكاء الاصطناعي</h2><p class="muted">انسخه والصقه في Copilot أو أي أداة، ثم الصق الناتج في مربع أسئلة الدرس واضغط «حفظ».</p><textarea class="field" rows="12" readonly dir="rtl">${esc(p)}</textarea>
      <div class="row"><button class="btn" data-c>📋 نسخ</button><button class="btn ghost" data-x>إغلاق</button></div>`, 'wide');
    $('[data-c]', m.el).onclick = async e => { try { await navigator.clipboard.writeText(p); } catch (er) {} e.target.textContent = '✅ تم النسخ'; };
    $('[data-x]', m.el).onclick = m.close;
  }
  // ---- محتوى غير مربوط: دروس حُذفت من الخطة وبقي محتواها ----
  TAB.orphans = el => {
    const ids = new Set(allLessons().map(l => l.id));
    const orphan = [...new Set([...Object.keys(window.CONTENT), ...Object.keys(CUSTOM.content)])].filter(id => !ids.has(id) && itemsOf(id).length);
    const titleOf = id => { for (const gr of window.PLAN.grades) for (const u of gr.units) for (const l of u.lessons) if (l.id === id) return `الصف ${GRADE[gr.g]} — ${l.title}`; return 'درس محذوف'; };
    const opts = PLANX().grades.map(gr => `<optgroup label="الصف ${GRADE[gr.g]}">${gr.units.flatMap(u => u.lessons).map(l => `<option value="${l.id}">${esc(l.title)}</option>`).join('')}</optgroup>`).join('');
    el.innerHTML = `<p class="muted">عندما تحذف درسًا من الخطة يبقى محتواه هنا لتربطه بدرس آخر (مثلاً عند تغيّر الخطة في العام الجديد).</p>
      ${orphan.length ? orphan.map(id => `<div class="pl"><span class="cnt">${itemsOf(id).length}</span><b style="flex:1">${esc(titleOf(id))}</b><select class="field sm" data-to="${id}"><option value="">اربطه بدرس…</option>${opts}</select><button class="iconbtn sm" data-od="${id}" title="حذف نهائي">🗑️</button></div>`).join('') : '<p>✅ كل المحتوى مربوط بدروس الخطة.</p>'}`;
    $$('[data-to]', el).forEach(s => s.onchange = async () => { if (!s.value) return; const from = s.dataset.to, to = s.value;
      CUSTOM.content[to] = [...itemsOf(to), ...itemsOf(from)]; CUSTOM.content[from] = []; await saveCustom(); toast('✅ نُقل المحتوى إلى الدرس.'); TAB.orphans(el); });
    $$('[data-od]', el).forEach(b => b.onclick = async () => { if (await confirmBox('حذف هذا المحتوى نهائيًا؟', 'حذف')) { CUSTOM.content[b.dataset.od] = []; await saveCustom(); TAB.orphans(el); } });
  };
  TAB.data = el => {
    el.innerHTML = `<h3>🌐 ملف التعديلات (custom.json)</h3><p class="muted">ملف موقّع فيه تعديلاتك على الخطط والأسئلة والإعدادات. ارفعه إلى مجلد التطبيق على الموقع ليصل لكل الطلبة، أو أرسله لزميل ليستورده.</p>
      <div class="row" style="justify-content:flex-start"><button class="btn" id="dExp">📤 تصدير ملف التعديلات</button><button class="btn ghost" id="dImp">📥 استيراد ملف تعديلات</button></div>`;
    $('#dExp', el).onclick = async () => { const out = JSON.stringify({ ...CUSTOM, sig: await sign(sigText(CUSTOM)) }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'application/json' })); a.download = 'custom.json'; a.click(); };
    $('#dImp', el).onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async () => {
      try { const d = JSON.parse(await i.files[0].text()), c = { settings: d.settings || {}, plan: d.plan || null, content: d.content || {} };
        if (d.sig !== await sign(sigText(c))) return toast('❌ الملف غير موثّق أو تم تعديله خارج التطبيق.');
        if (!await confirmBox('استيراد هذا الملف يستبدل الخطط والأسئلة الحالية على هذا الجهاز (تبقى كلمة مرورك). متابعة؟', 'استيراد')) return;
        CUSTOM = { ...c, settings: { ...c.settings, pass: CUSTOM.settings.pass } }; await saveCustom(); toast('✅ تم الاستيراد.'); } catch (e) { toast('❌ الملف غير صالح.'); } }; i.click(); };
  };
  TAB.settings = el => {
    el.innerHTML = `<div class="form"><label>اسم المدرسة<input class="field" id="sSchool" value="${esc(SET().school)}"></label></div><button class="btn" id="sSave">حفظ</button>
      <h3>🔑 تغيير كلمة المرور</h3><div class="form"><label>الحالية<input class="field ltr" type="password" id="c0"></label><label>الجديدة<input class="field ltr" type="password" id="c1"></label><label>تأكيدها<input class="field ltr" type="password" id="c2"></label></div><button class="btn ghost" id="cGo">تغيير</button>`;
    $('#sSave', el).onclick = async () => { CUSTOM.settings.school = $('#sSchool', el).value.trim(); await saveCustom(); toast('✅ تم الحفظ'); };
    $('#cGo', el).onclick = async () => { const p1 = $('#c1', el).value; if (!await checkPass($('#c0', el).value)) return toast('❌ كلمة المرور الحالية غير صحيحة'); if (passError(p1)) return toast(passError(p1)); if (p1 !== $('#c2', el).value) return toast('❌ غير متطابقتين'); await setPass(p1); toast('✅ تم التغيير'); };
  };

  // ====================== بدء التشغيل ======================
  const teacherFromHash = () => { if (location.hash !== '#teacher') return; history.replaceState(null, '', location.pathname + location.search); teacherLogin(); };
  document.addEventListener('keydown', e => { if (e.ctrlKey && e.altKey && e.code === 'KeyT') { e.preventDefault(); teacherLogin(); } });
  addEventListener('hashchange', teacherFromHash);
  window.__dbg = { fromText, toText, itemsOf, GAME };
  window.DHAD = { $, $$, esc, shuffle, GRADE, KIND, PLANX, gradeOf, itemsOf, RENDER, speedQs, say, beep, confetti, modal, show, renderLogin, sound: () => DB.sound };
  // يبدأ بعد تحميل كل ملفات الصفحة (ومنها class.js إن وُجد)
  addEventListener('DOMContentLoaded', () => { loadDB(); loadCustom().then(renderLogin).then(teacherFromHash); });
})();
