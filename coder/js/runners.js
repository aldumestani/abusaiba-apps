/* تشغيل الأكواد وتلوينها */
(function (g) {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- تلوين الكود ----------
  const KW = {
    js: 'let|const|var|if|else|for|while|function|return|true|false|console|log',
    py: 'if|elif|else|for|in|while|def|return|True|False|and|or|not|print|range|len|import',
    txt: 'if|else|loop|repeat',
  };
  function highlight(src, lang) {
    src = String(src);
    if (lang === 'html' || lang === 'css') return hlHTML(src, lang);
    const kw = KW[lang] || KW.txt;
    const re = new RegExp('(#.*$|//.*$)|("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(' + kw + ')\\b', 'gm');
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
      if (lang === 'txt' && m[1]) { out += esc(m[0]); } else out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function hlHTML(src, lang) {
    let out = '', last = 0, m;
    const re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9]+)|(\s[a-zA-Z-]+)(?==)|("[^"\n]*")|(\/?>)|(\b[a-z-]+)(?=\s*:[^:])|(\b\d+px\b)/g;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] || m[5] ? 't' : m[3] ? 'a' : m[4] ? 's' : m[6] ? 'f' : 'n';
      out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  // ---------- ترجمة الأخطاء ----------
  function arabicError(msg) {
    const m = String(msg);
    const map = [
      [/IndentationError|unindent|expected an indented block/i, 'خطأ في المسافة البادئة (Indentation): تأكد من وجود 4 مسافات قبل الأوامر داخل if أو for.'],
      [/TimeLimit|timeout|time limit/i, 'استغرق الكود وقتاً طويلاً ⏳ هل توجد حلقة لا تنتهي (Infinite Loop)؟'],
      [/NameError|ReferenceError|is not defined/i, 'اسم غير معروف: هل كتبت اسم المتغيّر أو الأمر بشكل صحيح؟ (انتبه للحروف الكبيرة والصغيرة)'],
      [/SyntaxError|ParseError|Unexpected|invalid syntax|missing/i, 'خطأ في كتابة الكود (Syntax Error): تأكد من الأقواس ( ) وعلامات التنصيص " " والنقطتين :'],
      [/TypeError/i, 'نوع البيانات غير مناسب (Type Error): هل تجمع نصاً مع رقم؟ أو تستدعي أمراً غير موجود؟'],
      [/ZeroDivision/i, 'لا يمكن القسمة على صفر!'],
    ];
    for (const [re, ar] of map) if (re.test(m)) return ar;
    return 'يوجد خطأ في الكود 🐞 راجعه وحاول مرة أخرى.';
  }

  // ---------- JavaScript داخل Worker مع مهلة ----------
  const workerSrc = `
    const out = [];
    const fmt = v => typeof v === 'string' ? v : (v === undefined ? 'undefined' : (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    const push = (s) => { if (out.length > 300) throw new Error('TimeLimitError: too much output'); out.push(s); };
    console = { log: (...a) => push(a.map(fmt).join(' ')), error: (...a) => out.push(a.map(fmt).join(' ')), warn: (...a) => out.push(a.map(fmt).join(' ')) };
    self.alert = (x) => out.push(fmt(x));
    onmessage = (e) => {
      try { (new Function(e.data))(); postMessage({ out }); }
      catch (err) { postMessage({ out, err: (err && err.name ? err.name + ': ' + err.message : String(err)) }); }
    };`;
  let workerURL = null;
  function runJS(code, timeout = 2500) {
    return new Promise(resolve => {
      let w;
      try {
        workerURL = workerURL || URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' }));
        w = new Worker(workerURL);
      } catch (e) {
        // بديل احتياطي بدون Worker
        const out = [];
        const con = { log: (...a) => out.push(a.join(' ')) };
        try { new Function('console', code)(con); resolve({ out: out.join('\n') }); }
        catch (err) { resolve({ out: out.join('\n'), err: err.name + ': ' + err.message }); }
        return;
      }
      const t = setTimeout(() => { w.terminate(); resolve({ out: '', err: 'TimeLimitError: timeout' }); }, timeout);
      w.onmessage = e => { clearTimeout(t); w.terminate(); resolve({ out: e.data.out.join('\n'), err: e.data.err }); };
      w.onerror = e => { clearTimeout(t); w.terminate(); resolve({ out: '', err: 'SyntaxError: ' + (e.message || '') }); e.preventDefault(); };
      w.postMessage(code);
    });
  }

  // ---------- Python عبر Skulpt ----------
  function runPy(code) {
    return new Promise(resolve => {
      if (!g.Sk) return resolve({ out: '', err: 'Python engine not loaded' });
      let out = '';
      Sk.configure({
        output: t => { out += t; if (out.length > 20000) throw new Error('TimeLimitError: too much output'); },
        read: x => { if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw "File not found: '" + x + "'"; return Sk.builtinFiles.files[x]; },
        __future__: Sk.python3, execLimit: 3000, yieldLimit: 100,
        inputfun: () => '', inputfunTakesPrompt: true,
      });
      Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true))
        .then(() => resolve({ out: out.replace(/\n$/, '') }))
        .catch(err => resolve({ out: out.replace(/\n$/, ''), err: String(err.toString ? err.toString() : err) }));
    });
  }

  // ---------- HTML داخل iframe ----------
  function htmlDoc(code) {
    return '<!doctype html><html dir="rtl"><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;margin:14px;}</style></head><body>' + code + '</body></html>';
  }
  function runHTML(iframe, code) {
    return new Promise(resolve => {
      iframe.onload = () => resolve(iframe.contentDocument);
      iframe.srcdoc = htmlDoc(code);
    });
  }
  function checkHTML(doc, checks) {
    if (!doc) return 'تعذّر قراءة الصفحة';
    const win = doc.defaultView;
    for (const c of checks) {
      const els = Array.from(doc.querySelectorAll(c.sel));
      if (c.none) { if (els.length) return c.msg; continue; }
      if (!els.length) return c.msg;
      if (c.min && els.length < c.min) return c.msg;
      if (c.hasText && !els.some(e => e.textContent.trim())) return c.msg;
      if (c.prop) {
        const v = win.getComputedStyle(els[0]).getPropertyValue(c.prop).trim();
        if (c.eq !== undefined && v !== c.eq) return c.msg;
        if (c.notEq !== undefined && v === c.notEq) return c.msg;
      }
    }
    return null;
  }

  g.Run = { highlight, esc, runJS, runPy, runHTML, checkHTML, arabicError };
})(window);
