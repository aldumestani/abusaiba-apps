/* رسومات الشخصيات والأغلفة — SVG أصلية مرسومة للتطبيق */
(function (g) {
  'use strict';
  let uid = 0;
  const id = p => p + (++uid);
  const svg = (vb, body, cls = '') => `<svg class="art ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

  // ---------- درع: الروبوت الحارس ----------
  function guide(mood = 'happy') {
    const a = id('gd'), b = id('gs');
    const mouth = mood === 'wow' ? '<ellipse cx="100" cy="98" rx="9" ry="11" fill="#1b1446"/>'
      : mood === 'sad' ? '<path d="M84 104 Q100 92 116 104" stroke="#1b1446" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : '<path d="M82 94 Q100 112 118 94" stroke="#1b1446" stroke-width="5" fill="none" stroke-linecap="round"/>';
    return svg('0 0 200 200', `
      <defs><linearGradient id="${a}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f6bff"/><stop offset="1" stop-color="#4b2bd6"/></linearGradient>
      <linearGradient id="${b}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9fbff"/><stop offset="1" stop-color="#b9e6ff"/></linearGradient></defs>
      <ellipse cx="100" cy="188" rx="52" ry="8" fill="#000" opacity=".12"/>
      <line x1="100" y1="22" x2="100" y2="6" stroke="#ffc83d" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="6" r="7" fill="#ff5d73" class="blink"/>
      <path d="M28 70 Q12 82 18 110" stroke="#5a3be0" stroke-width="12" fill="none" stroke-linecap="round" class="wave-l"/>
      <path d="M172 70 Q192 60 186 36" stroke="#5a3be0" stroke-width="12" fill="none" stroke-linecap="round" class="wave-r"/>
      <circle cx="18" cy="112" r="10" fill="#ffc83d"/><circle cx="186" cy="34" r="10" fill="#ffc83d"/>
      <path d="M100 20 L168 40 Q170 120 100 180 Q30 120 32 40 Z" fill="url(#${a})" stroke="#ffc83d" stroke-width="7" stroke-linejoin="round"/>
      <rect x="56" y="48" width="88" height="72" rx="22" fill="url(#${b})" stroke="#2c1b8f" stroke-width="4"/>
      <g class="eyes"><ellipse cx="82" cy="78" rx="8" ry="10" fill="#1b1446"/><ellipse cx="118" cy="78" rx="8" ry="10" fill="#1b1446"/>
      <circle cx="85" cy="74" r="3" fill="#fff"/><circle cx="121" cy="74" r="3" fill="#fff"/></g>
      ${mouth}
      <circle cx="68" cy="100" r="6" fill="#ff8fb0" opacity=".7"/><circle cx="132" cy="100" r="6" fill="#ff8fb0" opacity=".7"/>
      <path d="M86 140 l14 -10 l14 10 l-14 18 z" fill="#ffc83d" stroke="#fff3c4" stroke-width="3"/>`);
  }

  // ---------- سلمان ----------
  function salman(mood = 'happy') {
    const mouth = mood === 'wow' ? '<ellipse cx="100" cy="112" rx="8" ry="10" fill="#7a2b1e"/>'
      : mood === 'oops' ? '<path d="M86 114 Q93 108 100 114 Q107 120 114 114" stroke="#7a2b1e" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<path d="M84 108 Q100 124 116 108 Z" fill="#7a2b1e"/><path d="M88 110 Q100 114 112 110" stroke="#fff" stroke-width="4"/>';
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="190" rx="50" ry="7" fill="#000" opacity=".12"/>
      <path d="M44 196 Q48 140 100 136 Q152 140 156 196 Z" fill="#2f9bff"/>
      <path d="M84 138 L100 156 L116 138" fill="#fff"/>
      <path d="M90 168 l10 -7 l10 7 l-10 12 z" fill="#ffc83d"/>
      <rect x="88" y="124" width="24" height="18" rx="6" fill="#c98a5e"/>
      <circle cx="100" cy="88" r="46" fill="#d9a17a"/>
      <ellipse cx="54" cy="92" rx="9" ry="12" fill="#c98a5e"/><ellipse cx="146" cy="92" rx="9" ry="12" fill="#c98a5e"/>
      <path d="M54 82 Q52 36 100 36 Q150 36 146 82 Q140 58 118 56 Q126 66 114 66 Q100 54 84 62 Q70 56 62 70 Q58 74 54 82 Z" fill="#2a1a12"/>
      <g class="eyes"><ellipse cx="82" cy="90" rx="7" ry="9" fill="#2a1a12"/><ellipse cx="118" cy="90" rx="7" ry="9" fill="#2a1a12"/>
      <circle cx="84" cy="87" r="2.6" fill="#fff"/><circle cx="120" cy="87" r="2.6" fill="#fff"/></g>
      <path d="M72 74 Q82 68 92 74" stroke="#2a1a12" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M108 74 Q118 68 128 74" stroke="#2a1a12" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${mouth}
      <circle cx="70" cy="104" r="6" fill="#ff8a7a" opacity=".45"/><circle cx="130" cy="104" r="6" fill="#ff8a7a" opacity=".45"/>`);
  }

  // ---------- بسبوسة ----------
  function cat(mood = 'happy') {
    const mouth = mood === 'laugh' ? '<path d="M88 112 Q100 128 112 112 Z" fill="#a33b52"/>' : '<path d="M90 112 Q95 118 100 112 Q105 118 110 112" stroke="#5a2a14" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="190" rx="54" ry="7" fill="#000" opacity=".12"/>
      <path d="M150 170 Q196 160 180 120 Q172 104 160 116 Q174 130 160 150" fill="#f2a03d" class="tail"/>
      <ellipse cx="100" cy="150" rx="52" ry="42" fill="#f6ad4b"/>
      <ellipse cx="100" cy="158" rx="28" ry="26" fill="#fde3b8"/>
      <path d="M52 64 L60 20 L86 50 Z" fill="#f6ad4b"/><path d="M148 64 L140 20 L114 50 Z" fill="#f6ad4b"/>
      <path d="M60 56 L63 32 L78 50 Z" fill="#ffb3c7"/><path d="M140 56 L137 32 L122 50 Z" fill="#ffb3c7"/>
      <circle cx="100" cy="90" r="48" fill="#f6ad4b"/>
      <path d="M80 50 Q84 62 78 70 M100 46 L100 62 M120 50 Q116 62 122 70" stroke="#d9822a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="106" rx="26" ry="18" fill="#fde3b8"/>
      <g class="eyes"><ellipse cx="80" cy="88" rx="9" ry="11" fill="#2b2b2b"/><ellipse cx="120" cy="88" rx="9" ry="11" fill="#2b2b2b"/>
      <circle cx="83" cy="84" r="3.4" fill="#fff"/><circle cx="123" cy="84" r="3.4" fill="#fff"/></g>
      <path d="M95 102 L105 102 L100 108 Z" fill="#ff7a96"/>${mouth}
      <path d="M60 104 L36 98 M60 110 L36 112 M140 104 L164 98 M140 110 L164 112" stroke="#8a5a2a" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  // ---------- الأشرار ----------
  function fox() {
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="190" rx="50" ry="7" fill="#000" opacity=".12"/>
      <path d="M140 176 Q194 170 186 120 Q178 140 150 146" fill="#ff7b2e"/><path d="M178 132 Q186 120 186 120 Q190 150 168 160 Z" fill="#fff"/>
      <ellipse cx="100" cy="150" rx="44" ry="38" fill="#ff7b2e"/><ellipse cx="100" cy="158" rx="22" ry="26" fill="#fff4e6"/>
      <path d="M46 70 L52 18 L88 52 Z" fill="#ff7b2e"/><path d="M154 70 L148 18 L112 52 Z" fill="#ff7b2e"/>
      <path d="M56 58 L58 32 L76 50 Z" fill="#3b1d0e"/><path d="M144 58 L142 32 L124 50 Z" fill="#3b1d0e"/>
      <path d="M46 72 Q100 30 154 72 Q150 112 100 126 Q50 112 46 72 Z" fill="#ff8c3e"/>
      <path d="M62 96 Q100 140 138 96 Q120 128 100 130 Q80 128 62 96 Z" fill="#fff4e6"/>
      <path d="M62 78 Q82 66 96 82 Q80 92 62 78 Z M138 78 Q118 66 104 82 Q120 92 138 78 Z" fill="#3b1d0e"/>
      <circle cx="82" cy="80" r="4" fill="#ffe14d"/><circle cx="118" cy="80" r="4" fill="#ffe14d"/>
      <ellipse cx="100" cy="112" rx="8" ry="6" fill="#2b2b2b"/>
      <path d="M86 122 Q100 132 116 120" stroke="#3b1d0e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g transform="translate(36 128) rotate(-20)"><circle cx="0" cy="0" r="13" fill="none" stroke="#ffc83d" stroke-width="5"/><rect x="10" y="-3" width="26" height="6" rx="3" fill="#ffc83d"/><rect x="28" y="2" width="5" height="9" fill="#ffc83d"/><rect x="20" y="2" width="5" height="7" fill="#ffc83d"/></g>
      <text x="160" y="30" font-size="19" font-weight="900" fill="#ff7b2e" font-family="Arial" text-anchor="middle" direction="ltr">123?</text>`);
  }
  function parrot() {
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="192" rx="44" ry="6" fill="#000" opacity=".12"/>
      <rect x="40" y="168" width="120" height="10" rx="5" fill="#8a5a2a"/>
      <path d="M86 170 Q70 196 60 198 M114 170 Q130 196 140 198" stroke="#2c9f4b" stroke-width="0"/>
      <path d="M78 150 Q60 196 74 198 Q84 186 96 160 Z" fill="#2b6fe0"/><path d="M122 150 Q140 196 126 198 Q116 186 104 160 Z" fill="#ff4d5e"/>
      <ellipse cx="100" cy="122" rx="42" ry="50" fill="#33c25a"/><ellipse cx="100" cy="134" rx="24" ry="32" fill="#c8f5a8"/>
      <path d="M60 110 Q40 140 62 164 Q74 140 72 112 Z" fill="#26a149"/>
      <circle cx="100" cy="66" r="38" fill="#33c25a"/>
      <path d="M100 30 Q92 10 110 6 Q104 20 114 30" fill="#ff4d5e"/>
      <circle cx="86" cy="62" r="13" fill="#fff"/><circle cx="88" cy="62" r="7" fill="#1b1b1b"/><circle cx="90" cy="59" r="2.5" fill="#fff"/>
      <path d="M104 64 Q140 58 138 84 Q126 92 112 88 Q122 80 104 76 Z" fill="#ffb81f"/>
      <path d="M112 88 Q122 96 132 86" fill="#d98c00"/>
      <g transform="translate(136 30)"><path d="M0 0 h58 a10 10 0 0 1 10 10 v24 a10 10 0 0 1 -10 10 h-36 l-12 12 v-12 h-10 a10 10 0 0 1 -10 -10 v-24 a10 10 0 0 1 10 -10z" fill="#fff" stroke="#33c25a" stroke-width="3" transform="translate(-6 -4)"/>
      <text x="26" y="25" font-size="13" font-weight="800" text-anchor="middle" fill="#1b1b1b" font-family="Arial">BLA BLA</text></g>`);
  }
  function fisher() {
    return svg('0 0 200 200', `
      <ellipse cx="96" cy="192" rx="50" ry="7" fill="#000" opacity=".12"/>
      <path d="M150 24 Q190 30 186 70" stroke="#6b4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <line x1="186" y1="70" x2="186" y2="128" stroke="#555" stroke-width="2"/>
      <path d="M186 128 v14 a8 8 0 0 1 -14 0" stroke="#888" stroke-width="3" fill="none"/>
      <rect x="160" y="146" width="40" height="28" rx="4" fill="#fff" stroke="#e14d4d" stroke-width="3"/><path d="M160 146 L180 162 L200 146" stroke="#e14d4d" stroke-width="3" fill="none"/>
      <text x="180" y="196" font-size="12" font-weight="900" text-anchor="middle" fill="#e14d4d" font-family="Arial">FREE!</text>
      <path d="M50 196 Q52 132 96 128 Q140 132 142 196 Z" fill="#2e7d6b"/>
      <path d="M76 150 h40 v46 h-40z" fill="#ffd34d" opacity=".9"/>
      <circle cx="96" cy="92" r="40" fill="#e8b48c"/>
      <ellipse cx="96" cy="62" rx="58" ry="12" fill="#3b6f46"/><path d="M58 62 Q60 22 96 22 Q132 22 134 62 Z" fill="#4c8a57"/>
      <rect x="62" y="48" width="68" height="8" fill="#2f5a38"/>
      <path d="M150 24 L96 120" stroke="#6b4a2a" stroke-width="6" stroke-linecap="round"/>
      <g class="eyes"><circle cx="80" cy="90" r="6" fill="#222"/><circle cx="112" cy="90" r="6" fill="#222"/><circle cx="82" cy="88" r="2" fill="#fff"/><circle cx="114" cy="88" r="2" fill="#fff"/></g>
      <path d="M70 80 L90 84 M122 80 L102 84" stroke="#222" stroke-width="4" stroke-linecap="round"/>
      <path d="M70 108 Q96 96 122 108 Q110 124 96 126 Q82 124 70 108 Z" fill="#6b4a2a"/>
      <path d="M84 110 Q96 118 108 110" stroke="#fff" stroke-width="4" fill="none"/>`);
  }
  function cloud(mood = 'angry') {
    const happy = mood === 'happy';
    return svg('0 0 200 200', `
      ${happy ? '' : '<path d="M86 140 l-14 26 h14 l-10 26 l28 -36 h-14 l10 -16 z" fill="#ffd34d" class="bolt"/>'}
      ${happy ? '<g fill="#ff7ab0"><circle cx="70" cy="160" r="6"/><circle cx="104" cy="176" r="6"/><circle cx="136" cy="158" r="6"/></g>' : '<g stroke="#5aa9ff" stroke-width="5" stroke-linecap="round"><line x1="120" y1="150" x2="114" y2="166"/><line x1="140" y1="148" x2="134" y2="164"/><line x1="60" y1="150" x2="54" y2="166"/></g>'}
      <path d="M40 132 Q14 130 18 104 Q22 80 50 84 Q50 46 90 44 Q118 22 146 50 Q186 48 184 90 Q198 112 176 130 Z" fill="${happy ? '#ffd6ea' : '#6b7286'}" stroke="${happy ? '#ff9cc7' : '#4a5063'}" stroke-width="4"/>
      ${happy ? '<path d="M70 86 Q78 78 86 86 M114 86 Q122 78 130 86" stroke="#5a2a4a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 104 Q100 122 120 104" stroke="#5a2a4a" stroke-width="5" fill="none" stroke-linecap="round"/>'
        : '<path d="M64 76 L88 86 M136 76 L112 86" stroke="#232633" stroke-width="6" stroke-linecap="round"/><circle cx="80" cy="94" r="7" fill="#232633"/><circle cx="120" cy="94" r="7" fill="#232633"/><path d="M80 118 Q100 104 120 118" stroke="#232633" stroke-width="6" fill="none" stroke-linecap="round"/>'}`);
  }
  function masked() {
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="192" rx="50" ry="7" fill="#000" opacity=".12"/>
      <path d="M40 198 Q40 132 100 126 Q160 132 160 198 Z" fill="#e14d8a"/>
      <path d="M84 128 L100 150 L116 128" fill="#ffd1e3"/>
      <circle cx="100" cy="86" r="44" fill="#e2b08a"/>
      <ellipse cx="56" cy="90" rx="8" ry="11" fill="#d39c74"/><ellipse cx="144" cy="90" rx="8" ry="11" fill="#d39c74"/>
      <path d="M52 66 Q54 28 100 26 Q146 28 148 66 Z" fill="#3d3f58"/><path d="M40 66 h76 a8 8 0 0 1 0 12 h-76 a6 6 0 0 1 0 -12z" fill="#2c2e44"/>
      <text x="100" y="56" font-size="16" font-weight="900" fill="#ffd34d" text-anchor="middle" font-family="Arial">KID</text>
      <g class="mask"><circle cx="80" cy="88" r="15" fill="#fff" stroke="#1b1c2a" stroke-width="5"/><circle cx="120" cy="88" r="15" fill="#fff" stroke="#1b1c2a" stroke-width="5"/>
      <line x1="95" y1="88" x2="105" y2="88" stroke="#1b1c2a" stroke-width="5"/>
      <circle cx="82" cy="90" r="5" fill="#1b1c2a"/><circle cx="122" cy="90" r="5" fill="#1b1c2a"/>
      <path d="M100 92 Q114 112 98 114 Q90 114 94 108" fill="#e9a07a" stroke="#b9754f" stroke-width="3"/>
      <path d="M70 124 Q84 110 100 118 Q116 110 130 124 Q114 122 100 126 Q86 122 70 124 Z" fill="#3a2418"/></g>
      <rect x="62" y="160" width="76" height="30" rx="14" fill="#3d3f58"/><circle cx="82" cy="175" r="5" fill="#fff"/><circle cx="118" cy="171" r="4" fill="#fff"/><circle cx="126" cy="179" r="4" fill="#fff"/>
      <text x="172" y="44" font-size="38" font-weight="900" fill="#e14d8a" font-family="Arial">?</text>`);
  }
  function monster() {
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="192" rx="58" ry="7" fill="#000" opacity=".12"/>
      <path d="M36 190 Q24 110 52 70 Q100 20 148 70 Q176 110 164 190 Q150 176 136 190 Q122 176 108 190 Q94 176 80 190 Q66 176 50 190 Z" fill="#9b5cf6"/>
      <rect x="54" y="64" width="92" height="64" rx="12" fill="#1e1b3a" stroke="#c7a9ff" stroke-width="5"/>
      <g class="eyes"><path d="M70 92 Q80 84 90 92" stroke="#7df9ff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M110 92 Q120 84 130 92" stroke="#7df9ff" stroke-width="5" fill="none" stroke-linecap="round"/></g>
      <path d="M78 112 Q100 104 122 112" stroke="#7df9ff" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M64 76 h6 M130 76 h6" stroke="#7df9ff" stroke-width="3"/>
      <path d="M40 120 Q16 130 22 150" stroke="#9b5cf6" stroke-width="14" fill="none" stroke-linecap="round"/>
      <rect x="10" y="148" width="26" height="40" rx="5" fill="#222" stroke="#7df9ff" stroke-width="3"/>
      <text x="150" y="44" font-size="22" font-weight="900" fill="#9b5cf6" font-family="Arial">zZz</text>`);
  }
  function virus() {
    const spikes = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5, x = 100 + Math.cos(a) * 62, y = 104 + Math.sin(a) * 62; return `<line x1="100" y1="104" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2fae57" stroke-width="8" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#7be495"/>`; }).join('');
    return svg('0 0 200 200', `
      <ellipse cx="100" cy="192" rx="44" ry="6" fill="#000" opacity=".12"/>
      ${spikes}
      <circle cx="100" cy="104" r="48" fill="#4cd06f" stroke="#2fae57" stroke-width="5"/>
      <circle cx="78" cy="88" r="7" fill="#7be495"/><circle cx="124" cy="122" r="6" fill="#7be495"/>
      <path d="M78 98 L92 102 M122 98 L108 102" stroke="#123b1f" stroke-width="5" stroke-linecap="round"/>
      <circle cx="86" cy="106" r="5" fill="#123b1f"/><circle cx="114" cy="106" r="5" fill="#123b1f"/>
      <ellipse cx="100" cy="126" rx="9" ry="7" fill="#123b1f"/>
      <text x="152" y="28" font-size="18" font-weight="900" fill="#2fae57" text-anchor="middle">أتشوو!</text>`);
  }
  // ---------- أغراض ----------
  const items = {
    lock: '<g><rect x="-34" y="-6" width="68" height="56" rx="10" fill="#ffc83d" stroke="#c98c00" stroke-width="4"/><path d="M-20 -6 v-16 a20 20 0 0 1 40 0 v16" stroke="#9aa3b5" stroke-width="10" fill="none"/><circle cx="0" cy="18" r="8" fill="#7a5200"/><rect x="-3" y="18" width="6" height="16" fill="#7a5200"/></g>',
    key: '<g><circle cx="-18" cy="0" r="14" fill="none" stroke="#ffc83d" stroke-width="7"/><rect x="-6" y="-4" width="40" height="8" rx="4" fill="#ffc83d"/><rect x="22" y="2" width="6" height="12" fill="#ffc83d"/><rect x="12" y="2" width="6" height="9" fill="#ffc83d"/></g>',
    bubble: '<g><path d="M-36 -24 h72 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-46 l-14 14 v-14 h-12 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10z" fill="#fff" stroke="#33c25a" stroke-width="4"/><circle cx="-16" cy="0" r="5" fill="#33c25a"/><circle cx="0" cy="0" r="5" fill="#33c25a"/><circle cx="16" cy="0" r="5" fill="#33c25a"/></g>',
    mail: '<g><rect x="-36" y="-24" width="72" height="50" rx="6" fill="#fff" stroke="#e14d4d" stroke-width="4"/><path d="M-36 -24 L0 6 L36 -24" stroke="#e14d4d" stroke-width="4" fill="none"/><circle cx="30" cy="-24" r="12" fill="#e14d4d"/><text x="30" y="-18" font-size="16" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial">!</text></g>',
    heart: '<path d="M0 30 C-40 4 -34 -30 -10 -26 C-2 -25 0 -18 0 -14 C0 -18 2 -25 10 -26 C34 -30 40 4 0 30Z" fill="#ff5d8f" stroke="#fff" stroke-width="4"/>',
    question: '<g><circle r="30" fill="#ffd34d" stroke="#fff" stroke-width="4"/><text y="14" font-size="40" font-weight="900" fill="#7a4b00" text-anchor="middle" font-family="Arial">?</text></g>',
    phone: '<g><rect x="-22" y="-38" width="44" height="76" rx="9" fill="#26283a" stroke="#7df9ff" stroke-width="4"/><rect x="-16" y="-28" width="32" height="50" rx="3" fill="#7df9ff" opacity=".35"/><circle cx="0" cy="30" r="3" fill="#7df9ff"/></g>',
    clock: '<g><circle r="30" fill="#fff" stroke="#9b5cf6" stroke-width="5"/><path d="M0 -18 V0 L12 10" stroke="#9b5cf6" stroke-width="5" fill="none" stroke-linecap="round"/></g>',
    shield: '<path d="M0 -34 L30 -24 Q30 12 0 34 Q-30 12 -30 -24 Z" fill="#8f6bff" stroke="#ffc83d" stroke-width="4"/>',
    star: '<path d="M0 -20 L6 -6 L21 -6 L9 3 L13 18 L0 9 L-13 18 L-9 3 L-21 -6 L-6 -6 Z" fill="#ffd34d"/>',
  };
  const place = (k, x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" class="float">${items[k]}</g>`;

  const VILLAINS = { fox, parrot, fisher, cloud, masked, monster, virus };
  const CHARS = { guide, salman, cat, ...VILLAINS };

  // ---------- غلاف المرحلة ----------
  const COVER = {
    1: { c1: '#5b2bd6', c2: '#2a8cff', villain: 'fox', props: [['lock', 380, 120, 1.4, -8], ['key', 300, 64, 1, 18], ['key', 470, 200, .9, -30], ['star', 560, 50, 1, 0]] },
    2: { c1: '#0f9d76', c2: '#5bd6a6', villain: 'parrot', props: [['bubble', 380, 110, 1.4, 0], ['bubble', 290, 60, .8, -8], ['shield', 480, 190, 1, 10], ['star', 560, 46, 1, 0]] },
    3: { c1: '#0b5fb0', c2: '#3cc2ff', villain: 'fisher', props: [['mail', 380, 116, 1.5, -6], ['mail', 300, 200, .8, 12], ['question', 480, 56, .9, 0], ['star', 560, 190, .9, 0]] },
    4: { c1: '#d6336c', c2: '#ff9a62', villain: 'cloud', props: [['heart', 380, 116, 1.6, -6], ['heart', 300, 52, .8, 12], ['heart', 486, 200, .7, -12], ['star', 560, 52, 1, 0]] },
    5: { c1: '#4a2d8f', c2: '#e14d8a', villain: 'masked', props: [['question', 380, 110, 1.5, 0], ['bubble', 296, 200, .8, 0], ['shield', 486, 56, 1, -10], ['star', 560, 200, .9, 0]] },
    6: { c1: '#1e3a8a', c2: '#9b5cf6', villain: 'monster', props: [['phone', 360, 118, 1.3, -10], ['clock', 440, 96, 1.1, 8], ['shield', 300, 196, .8, 0], ['star', 560, 52, 1, 0]] },
  };
  function cover(stageId, defeated = false) {
    const c = COVER[stageId]; const gid = id('cv');
    const v = CHARS[c.villain](c.villain === 'cloud' && defeated ? 'happy' : undefined);
    const dots = Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 97) % 760}" cy="${(i * 53) % 260}" r="${2 + (i % 3)}" fill="#fff" opacity=".25"/>`).join('');
    return `<div class="cover ${defeated ? 'won' : ''}">` + svg('0 0 760 260', `
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient></defs>
      <rect width="760" height="260" fill="url(#${gid})"/>${dots}
      <path d="M0 220 Q190 180 380 214 T760 200 V260 H0Z" fill="#fff" opacity=".18"/>
      <path d="M0 240 Q200 214 400 238 T760 230 V260 H0Z" fill="#fff" opacity=".22"/>
      ${c.props.map(p => place(...p)).join('')}`) +
      `<div class="cv-guide">${guide(defeated ? 'happy' : 'happy')}</div>
       <div class="cv-villain ${defeated ? 'beaten' : ''}">${v}${defeated ? '<div class="stamp">هُزم! ✔</div>' : ''}</div></div>`;
  }
  // غلاف شاشة الدخول
  function appCover() {
    const gid = id('ac');
    const dots = Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 131) % 900}" cy="${(i * 71) % 300}" r="${2 + (i % 3)}" fill="#fff" opacity=".3"/>`).join('');
    return `<div class="app-cover">` + svg('0 0 900 300', `
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b2bd6"/><stop offset=".55" stop-color="#2a8cff"/><stop offset="1" stop-color="#21c7a8"/></linearGradient></defs>
      <rect width="900" height="300" rx="28" fill="url(#${gid})"/>${dots}
      <path d="M0 250 Q225 210 450 246 T900 236 V300 H0Z" fill="#fff" opacity=".2"/>
      ${place('lock', 140, 70, .8, -12)}${place('mail', 770, 70, .8, 10)}${place('heart', 700, 210, .6, -8)}${place('key', 220, 220, .8, 20)}${place('star', 460, 40, 1, 0)}${place('shield', 90, 200, .7, 0)}`) +
      `<div class="ac-guide">${guide('happy')}</div><div class="ac-salman">${salman('happy')}</div><div class="ac-cat">${cat('laugh')}</div></div>`;
  }

  g.ART = { guide, salman, cat, ...VILLAINS, CHARS, cover, appCover };
})(window);
