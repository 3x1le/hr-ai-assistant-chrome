(() => {
  if (window.__hhAssistantLoaded) return;
  window.__hhAssistantLoaded = true;

  const CSS = `
    :host { all: initial; }
    .panel { position: fixed; top: 80px; right: 16px; width: 360px; max-height: calc(100vh - 110px);
      display: flex; flex-direction: column; z-index: 2147483000; font: 14px/1.45 system-ui, sans-serif;
      color: #1c2623; background: #fff; border: 1px solid #c9d2cf; border-radius: 8px;
      box-shadow: 0 6px 24px rgba(0,0,0,.18); }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px;
      border-bottom: 1px solid #e1e7e5; font-weight: 600; }
    .head button { all: unset; cursor: pointer; padding: 2px 8px; border-radius: 4px; color: #4b5a56; }
    .head button:hover, .head button:focus-visible { background: #eef2f1; }
    .body { padding: 12px; overflow-y: auto; }
    .collapsed .body { display: none; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .qa { margin-bottom: 14px; }
    .qa h3 { margin: 0 0 6px; font-size: 18px; color: #1f6f66; }
    .qa-item { margin: 0 0 10px; padding-left: 8px; border-left: 3px solid #c9d2cf; }
    .qa-q { font-weight: 600; }
    .qa-a { white-space: pre-wrap; margin-top: 2px; }
    .qa-s { font-size: 12.5px; color: #4b5a56; margin-top: 2px; }
    .qa-s.warn { color: #9a6a12; }
    .btn { all: unset; cursor: pointer; padding: 7px 12px; border-radius: 6px; background: #1f6f66; color: #fff; font-weight: 600; }
    .btn.ghost { background: #eef2f1; color: #1c2623; }
    .btn:hover { filter: brightness(1.08); }
    .btn:focus-visible { outline: 2px solid #1f6f66; outline-offset: 2px; }
    .btn[disabled] { opacity: .5; cursor: default; }
    .status { color: #4b5a56; margin: 4px 0 8px; }
    .error { color: #a33b2e; margin: 4px 0 8px; }
    .verdict { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
    .verdict b { font-size: 18px; }
    .apply { color: #2f6b3b; } .lean_yes { color: #4d7a2a; } .doubtful { color: #9a6a12; } .skip { color: #a33b2e; }
    h4 { margin: 12px 0 4px; font-size: 13px; }
    ul { margin: 0; padding-left: 0; list-style: none; }
    li { margin: 0 0 8px; padding-left: 8px; border-left: 3px solid #c9d2cf; }
    li.pro { border-color: #2f6b3b; } li.con { border-color: #a33b2e; } li.unk { border-color: #9a6a12; }
    .quote { color: #4b5a56; font-size: 12.5px; margin-top: 2px; }
    .warn { color: #9a6a12; font-size: 12.5px; }
    textarea { width: 100%; box-sizing: border-box; min-height: 200px; padding: 8px; border: 1px solid #c9d2cf;
      border-radius: 6px; font: inherit; resize: vertical; }
    .meta { color: #4b5a56; font-size: 12.5px; margin: 4px 0 8px; }
    .link { all: unset; cursor: pointer; color: #1f6f66; text-decoration: underline; font-size: 12.5px; }
    .panel { --bg: #fff; --ink: #1c2623; }
    .tone { margin-top: 16px; }
    .tone h3 { margin: 0 0 6px; font-size: 18px; color: #a33b2e; }
    .tone-row { display: flex; align-items: center; gap: 12px; }
    .gauge { width: 150px; flex: none; }
    .gauge path { stroke: var(--bg); stroke-width: 2; }
    .gauge .needle { fill: var(--ink); transform-origin: 110px 105px; transition: transform .8s cubic-bezier(.2,.8,.2,1); }
    .gauge .hub { fill: var(--ink); }
    .tone-label { font-weight: 800; font-size: 15px; line-height: 1.25; }
    .lv1 { color: #0a7a0a; } .lv2 { color: #6f9400; } .lv3 { color: #a88600; } .lv4 { color: #d96d00; } .lv5 { color: #d11a1a; }
    .roast { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e1e7e5; }
    .roast h4 { margin: 0 0 4px; font-size: 15px; color: #a33b2e; }
    .roast ol { margin: 8px 0 0; padding-left: 20px; }
    .roast li { margin: 0 0 9px; padding-left: 4px; border: 0; }
    .rq-q { font-weight: 600; }
    .rq-tag { display: inline-block; margin-right: 6px; padding: 0 6px; border-radius: 3px; font-size: 11.5px; font-weight: 400; background: #eef2f1; color: #4b5a56; }
    .rq-tag.high { background: #ffd9d4; color: #7a2a1f; }
    .rq-why { color: #4b5a56; font-size: 12.5px; margin-top: 2px; }
    .tone-title { font-weight: 700; margin: 8px 0 2px; }
    .tone-text { margin: 0; }
    @media (prefers-reduced-motion: reduce) { .gauge .needle { transition: none; } }
    .model { margin: 0 0 8px; padding: 4px 7px 5px; max-height: 100px; overflow: hidden; border: 1px solid #e1e7e5; border-radius: 6px; background: #f6f9f8; font-size: 10.5px; line-height: 1.3; }
    .model-line { display: flex; align-items: baseline; gap: 4px; min-width: 0; font-size: 11px; white-space: nowrap; }
    .model-k { flex: none; color: #4b5a56; font-size: 10.5px; }
    .model-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
    .model-name.warn { color: #a33b2e; }
    .model-sub { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: #4b5a56; font-size: 10px; }
    .model-line .link { flex: none; margin-left: auto; font-size: 10px; }
    .lim { display: grid; grid-template-columns: 44px 1fr 27px auto; align-items: center; gap: 5px; margin-top: 3px; color: #4b5a56; }
    .lim-lab { white-space: nowrap; }
    .lim-val { white-space: nowrap; }
    .bar { height: 6px; border-radius: 3px; background: #dfe6e4; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width .6s cubic-bezier(.2,.8,.2,1); }
    .bar-fill.ok { background: #2f6b3b; } .bar-fill.mid { background: #c98a00; } .bar-fill.low { background: #b5382c; }
    .bar-pct { text-align: right; font-weight: 700; color: #1c2623; }
    .lim-note { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: #4b5a56; }
    .lim-note.warn { color: #9a6a12; }
    @media (prefers-reduced-motion: reduce) { .bar-fill { transition: none; } }
    .links { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 2147483001; overflow: visible; }
    .links .ln { stroke-width: 1; stroke-linecap: round; opacity: .8; }
    .links .dot { opacity: .9; }
    .l-crit { stroke: #a33b2e; fill: #a33b2e; } .l-warn { stroke: #c98a00; fill: #c98a00; } .l-good { stroke: #2f6b3b; fill: #2f6b3b; }
    .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
    .chip { padding: 1px 6px; border-radius: 3px; font-size: 12px; color: #1c1c1c; }
    .chip.crit { background: #ff6161; } .chip.warn { background: #ffb300; } .chip.good { background: #b9e8c2; }
    @media (prefers-color-scheme: dark) {
      .panel { background: #1b2321; color: #e4ebe9; border-color: #34423e; --bg: #1b2321; --ink: #e4ebe9; }
      .tone h3 { color: #e0806f; }
      .model { background: #151c1a; border-color: #2c3935; } .model-k, .model-sub, .lim, .lim-note { color: #a9b8b4; } .bar-pct { color: #e4ebe9; }
      .model-name.warn { color: #ff8f80; } .lim-note.warn { color: #e0bd2e; } .bar { background: #2c3935; }
      .bar-fill.ok { background: #5fd35f; } .bar-fill.mid { background: #e0a82e; } .bar-fill.low { background: #ff6b6b; }
      .roast { border-color: #2c3935; } .roast h4 { color: #e0806f; }
      .rq-tag { background: #26312e; color: #a9b8b4; } .rq-tag.high { background: #5a2a24; color: #ffd9d4; } .rq-why { color: #a9b8b4; }
      .lv1 { color: #5fd35f; } .lv2 { color: #a6cf3a; } .lv3 { color: #e0bd2e; } .lv4 { color: #ff9a3d; } .lv5 { color: #ff6b6b; }
      .head { border-color: #2c3935; } .head button { color: #a9b8b4; } .head button:hover { background: #26312e; }
      .btn.ghost { background: #26312e; color: #e4ebe9; }
      textarea { background: #151c1a; color: #e4ebe9; border-color: #34423e; }
      .status, .quote, .meta { color: #a9b8b4; }
      li { border-color: #34423e; }
    }
  `;

  const VERDICT = { apply: 'Откликаться', lean_yes: 'Скорее да', doubtful: 'Сомнительно', skip: 'Пропустить' };
  const SEVERITY = { low: 'слабый', mid: 'средний', high: 'сильный' };

  let host, panel, result, status, btnAnalyze, btnLetter, lastUrl = location.href;
  let lastAnalysis = null;
  let settingsCache = null;
  let qaBox, btnQa, legendEl, modelBox, linesSvg;

  function h(tag, props, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
    return e;
  }

  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (r) => {
          const err = chrome.runtime.lastError;
          resolve(r || { ok: false, error: err ? err.message : 'Нет ответа от расширения.' });
        });
      } catch (e) {
        resolve({ ok: false, error: 'Расширение было обновлено. Перезагрузите страницу.' });
      }
    });
  }

  // ---------- чтение вакансии ----------

  function txt(sel) {
    const el = document.querySelector(sel);
    return el ? el.innerText.trim() : '';
  }

  function readVacancy() {
    const meta = [
      '[data-qa="vacancy-experience"]',
      '[data-qa="common-employment-text"]',
      '[data-qa="work-formats-text"]',
      '[data-qa="vacancy-view-location"]'
    ]
      .map(txt)
      .filter(Boolean)
      .join('; ');
    let desc = txt('[data-qa="vacancy-description"]');
    if (!desc) desc = ((document.querySelector('main') || document.body).innerText || '').trim();
    return {
      url: location.href,
      title: txt('[data-qa="vacancy-title"]') || txt('h1'),
      company: txt('[data-qa="vacancy-company-name"]'),
      salary: txt('[data-qa="vacancy-salary"]'),
      meta,
      text: desc.slice(0, 12000)
    };
  }

  // ---------- вставка в форму ----------

  function visible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function findLetterField() {
    const sels = [
      '[data-qa="vacancy-response-popup-form-letter-input"]',
      '[data-qa="vacancy-response-letter-input"]',
      'textarea[name="text"]',
      '[data-qa*="letter"]'
    ];
    for (const s of sels) {
      for (const node of document.querySelectorAll(s)) {
        const t = node.tagName === 'TEXTAREA' ? node : node.querySelector('textarea');
        if (t && visible(t)) return t;
      }
    }
    const areas = [...document.querySelectorAll('textarea')].filter((t) => visible(t) && !panel.contains(t));
    return areas.length === 1 ? areas[0] : null;
  }

  function setValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- подсветка на странице ----------

  const HL = {
    crit: { label: 'Критично' },
    warn: { label: 'Под вопросом' },
    good: { label: 'Плюс' }
  };

  const PAGE_CSS = `
    mark.hha-mark { color: #1c1c1c; padding: 1px 3px; border-radius: 3px;
      -webkit-box-decoration-break: clone; box-decoration-break: clone; }
    mark.hha-crit { background: #ff6161; }
    mark.hha-warn { background: #ffb300; }
    mark.hha-good { background: #b9e8c2; }
    html.hha-off mark.hha-mark { background: transparent !important; padding: 0; }
  `;

  function injectPageStyle() {
    if (document.getElementById('hha-page-style')) return;
    const st = document.createElement('style');
    st.id = 'hha-page-style';
    st.textContent = PAGE_CSS;
    (document.head || document.documentElement).append(st);
  }

  const LETTER = /[\p{L}\p{N}]/u;

  // Только буквы и цифры, нижний регистр, «ё» = «е»: так цитата находится,
  // даже если модель изменила пробелы, тире или кавычки.
  function squashText(s) {
    let out = '';
    for (const ch of String(s || '').toLowerCase().replace(/ё/g, 'е')) {
      if (ch.length === 1 && LETTER.test(ch)) out += ch;
    }
    return out;
  }

  function vacancyRoot() {
    const d = document.querySelector('[data-qa="vacancy-description"]');
    const t = document.querySelector('[data-qa="vacancy-title"]');
    let r = d;
    while (r && t && !r.contains(t)) r = r.parentElement;
    return r || document.querySelector('main') || document.body;
  }

  function buildIndex() {
    const walker = document.createTreeWalker(vacancyRoot(), NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('script,style,noscript,textarea,input,select')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const chars = [], nodes = [], offs = [], lens = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      let i = 0;
      for (const ch0 of n.data) {
        const low = ch0.toLowerCase().replace(/ё/g, 'е');
        for (const ch of low) {
          if (ch.length === 1 && LETTER.test(ch)) {
            chars.push(ch);
            nodes.push(n);
            offs.push(i);
            lens.push(ch0.length);
          }
        }
        i += ch0.length;
      }
    }
    return { text: chars.join(''), nodes, offs, lens };
  }

  function wordBounds(node, s, e) {
    const d = node.data;
    while (s > 0 && LETTER.test(d[s - 1])) s--;
    while (e < d.length && LETTER.test(d[e])) e++;
    return [s, e];
  }

  function planRanges(idx, needle, max, expand) {
    const plans = [];
    let from = 0;
    while (plans.length < max) {
      const i = idx.text.indexOf(needle, from);
      if (i < 0) break;
      const j = i + needle.length;
      from = j;
      const segs = [];
      for (let k = i; k < j; k++) {
        const last = segs[segs.length - 1];
        if (last && last.node === idx.nodes[k]) last.end = idx.offs[k] + idx.lens[k];
        else segs.push({ node: idx.nodes[k], start: idx.offs[k], end: idx.offs[k] + idx.lens[k] });
      }
      if (expand) {
        const f = segs[0];
        const l = segs[segs.length - 1];
        f.start = wordBounds(f.node, f.start, f.start)[0];
        l.end = wordBounds(l.node, l.end, l.end)[1];
      }
      plans.push(segs);
    }
    return plans;
  }

  function wrapPlan(segs, kind, tip, tag) {
    // не накладываем подсветку на уже подсвеченное место
    if (segs.some((s) => s.node.parentElement && s.node.parentElement.closest('.hha-mark'))) return false;
    for (let n = segs.length - 1; n >= 0; n--) {
      const s = segs[n];
      const range = document.createRange();
      range.setStart(s.node, s.start);
      range.setEnd(s.node, s.end);
      const mark = document.createElement('mark');
      mark.className = 'hha-mark hha-' + kind;
      mark.title = tip;
      if (tag) mark.dataset.hhaTag = tag; // по тегу линия находит подсвеченное место пункта
      range.surroundContents(mark);
    }
    return true;
  }

  // Подсвечивает все вхождения (до max штук). Возвращает, сколько подсвечено.
  function highlight(needleRaw, kind, tip, max, expand, tag) {
    const needle = squashText(needleRaw);
    if (needle.length < 3) return 0;
    const plans = planRanges(buildIndex(), needle, max, expand);
    let ok = 0;
    for (let p = plans.length - 1; p >= 0; p--) {
      try {
        if (wrapPlan(plans[p], kind, tip, tag)) ok++;
      } catch (e) {}
    }
    return ok;
  }

  // Цитата от модели может содержать служебную метку («Зарплата: …») или склеивать фрагменты.
  function highlightQuote(quote, kind, tip, tag) {
    if (highlight(quote, kind, tip, 1, false, tag)) return 1;
    const noLabel = String(quote).replace(/^[^:]{1,25}:\s*/, '');
    if (noLabel !== quote && highlight(noLabel, kind, tip, 1, false, tag)) return 1;
    for (const part of String(quote).split(/[.;!?\n]|\s{2,}/)) {
      if (squashText(part).length >= 12 && highlight(part, kind, tip, 1, false, tag)) return 1;
    }
    return 0;
  }

  function clearHighlights() {
    const parents = new Set();
    document.querySelectorAll('mark.hha-mark').forEach((m) => {
      const p = m.parentNode;
      if (!p) return;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      parents.add(p);
    });
    parents.forEach((p) => p.normalize());
  }

  const KIND_ORDER = { crit: 0, warn: 1, good: 2 };

  function ruleKind(r) {
    if (r.kind === 'plus') return 'good';
    if (r.kind === 'stop') return 'crit';
    return r.weight === 'high' ? 'crit' : 'warn';
  }

  function applyAll() {
    clearHighlights();
    const stats = { found: 0, missed: 0 };

    // 1. Места, на которые указала модель при оценке вакансии
    if (lastAnalysis) {
      const items = [];
      (lastAnalysis.cons || []).forEach((c, i) => {
        items.push({ kind: c.severity === 'high' ? 'crit' : 'warn', q: c.quote, tip: c.point, id: 'c' + i });
      });
      (lastAnalysis.pros || []).forEach((p, i) => items.push({ kind: 'good', q: p.quote, tip: p.point, id: 'p' + i }));
      items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
      for (const it of items) {
        if (!it.q) continue;
        if (highlightQuote(it.q, it.kind, HL[it.kind].label + ': ' + (it.tip || ''), it.id)) stats.found++;
        else stats.missed++;
      }
    }

    // 2. Ключевые слова из критериев (работает и без обращения к модели)
    const s = settingsCache;
    if (s && !(s.highlight && s.highlight.auto === false)) {
      const rules = (s.rules || [])
        .filter((r) => r.keywords && r.keywords.trim())
        .map((r) => ({ r, kind: ruleKind(r) }))
        .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
      for (const { r, kind } of rules) {
        const tip = HL[kind].label + ': ' + (r.text || '');
        for (const kw of r.keywords.split(',').map((w) => w.trim()).filter(Boolean)) {
          highlight(kw, kind, tip, 8, true);
        }
      }
    }
    return stats;
  }

  async function refresh() {
    try {
      settingsCache = await loadSettings();
    } catch (e) {}
    renderModelBox();
    if (!/\/applicant\/vacancy_response/.test(location.pathname)) applyAll();
    scheduleLines();
  }

  // ---------- вопросы работодателя (тест к вакансии) ----------

  const isResponsePage = () => /\/applicant\/vacancy_response/.test(location.pathname);

  function currentVacancyId() {
    const m = location.pathname.match(/\/vacancy\/(\d+)/);
    return (m && m[1]) || new URLSearchParams(location.search).get('vacancyId') || '';
  }

  function decodeEntities(s) {
    const t = document.createElement('textarea');
    t.innerHTML = s;
    return t.value;
  }

  function cleanLines(s) {
    return s.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  }

  function htmlToText(html) {
    const s = decodeEntities(html || '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|ul|ol)>/gi, '\n');
    return cleanLines(new DOMParser().parseFromString(s, 'text/html').body.textContent || '');
  }

  function nodeText(el) {
    const s = el.innerHTML.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|ul|ol)>/gi, '\n');
    return cleanLines(new DOMParser().parseFromString(s, 'text/html').body.textContent || '');
  }

  // Вакансия для контекста. На странице отклика текста вакансии нет, поэтому берём её страницу.
  const vacancyCache = new Map();
  async function getVacancy() {
    if (!isResponsePage()) return readVacancy();
    const id = currentVacancyId();
    if (vacancyCache.has(id)) return vacancyCache.get(id);
    const v = { url: location.origin + '/vacancy/' + id, title: '', company: '', salary: '', meta: '', text: '' };
    try {
      const res = await fetch(v.url, { credentials: 'include' });
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const t = (sel) => {
        const e = doc.querySelector(sel);
        return e ? nodeText(e) : '';
      };
      v.title = t('[data-qa="vacancy-title"]') || t('h1');
      v.company = t('[data-qa="vacancy-company-name"]');
      v.salary = t('[data-qa="vacancy-salary"]');
      v.meta = ['[data-qa="vacancy-experience"]', '[data-qa="common-employment-text"]', '[data-qa="work-formats-text"]', '[data-qa="vacancy-view-location"]']
        .map(t).filter(Boolean).join('; ');
      v.text = t('[data-qa="vacancy-description"]').slice(0, 12000);
    } catch (e) {}
    vacancyCache.set(id, v);
    return v;
  }

  // Вопросы теста лежат в состоянии страницы (шаблон HH-Lux-InitialState). Нужны их идентификаторы и тексты.
  let testMeta = { id: null, promise: null };
  function getTestMeta() {
    const id = currentVacancyId();
    if (testMeta.id !== id || !testMeta.promise) testMeta = { id, promise: loadTestMeta(id) };
    return testMeta.promise;
  }

  async function loadTestMeta(id) {
    let state = null;
    const tpl = document.getElementById('HH-Lux-InitialState');
    if (tpl) {
      try {
        state = JSON.parse(decodeEntities(tpl.innerHTML));
      } catch (e) {}
    }
    if (!state || !state.vacancyTests) {
      try {
        const r = await fetch(location.href, { credentials: 'include' });
        const m = (await r.text()).match(/<template[^>]*id="HH-Lux-InitialState"[^>]*>([\s\S]*?)<\/template>/);
        if (m) state = JSON.parse(decodeEntities(m[1]));
      } catch (e) {}
    }
    const t = state && state.vacancyTests && state.vacancyTests[id];
    if (!t) return null;
    return { questions: (t.tasks || []).map((x) => ({ id: x.id, text: htmlToText(x.description) })) };
  }

  const isLetterField = (el) =>
    /^(text|letter)$/i.test(el.name || '') || /letter/i.test(el.getAttribute('data-qa') || '') || !!el.closest('[data-qa*="letter"]');

  function optionLabel(el, form) {
    let lab = el.id ? form.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
    lab = lab || el.closest('label');
    let t = lab ? lab.innerText : '';
    if (!t.trim() && el.parentElement) t = el.parentElement.innerText;
    return (t || '').replace(/\s+/g, ' ').trim();
  }

  function buildQuestion(text, fields, form, id) {
    const texts = fields.filter((f) => f.tagName === 'TEXTAREA' || f.type === 'text');
    const selects = fields.filter((f) => f.tagName === 'SELECT');
    const checks = fields.filter((f) => f.type === 'checkbox');
    const radios = fields.filter((f) => f.type === 'radio');
    let type = 'open';
    let options = [];
    if (!texts.length) {
      if (selects.length) {
        type = 'single';
        options = [...selects[0].options].filter((o) => o.value !== '').map((o) => ({ text: o.text.trim(), el: o }));
      } else if (checks.length) {
        type = 'multiple';
        options = checks.map((el) => ({ text: optionLabel(el, form), el }));
      } else {
        type = 'single';
        options = radios.map((el) => ({ text: optionLabel(el, form), el }));
      }
    }
    const limit = texts[0] && texts[0].maxLength > 0 ? texts[0].maxLength : null;
    return { id, text, type, options, fields, limit };
  }

  // Находит форму с вопросами и поля ответов. Сначала по идентификаторам заданий (name="task_<id>..."),
  // если не вышло, то по порядку: поле относится к ближайшему сверху заголовку <strong>.
  function scanTestForm(meta) {
    const named = document.querySelector('[name^="task_"]');
    let form = named ? named.closest('form') : null;
    if (!form && isResponsePage()) {
      form =
        [...document.querySelectorAll('form')].find(
          (f) => f.querySelector('strong') && f.querySelector('textarea, input[type="radio"], input[type="checkbox"]')
        ) || null;
    }
    if (!form) return null;
    const all = [...form.querySelectorAll('textarea, input[type="radio"], input[type="checkbox"], input[type="text"], select')].filter(
      (el) => !isLetterField(el) && (visible(el) || el.type === 'radio' || el.type === 'checkbox')
    );
    if (!all.length) return null;

    let questions = [];
    if (meta && meta.questions.length) {
      for (const t of meta.questions) {
        const re = new RegExp('task_' + t.id + '(?!\\d)');
        const fs = all.filter((el) => re.test(el.name || ''));
        if (fs.length) questions.push(buildQuestion(t.text, fs, form, t.id));
      }
    }
    if (!questions.length) {
      const heads = [...form.querySelectorAll('strong')].filter((s) => s.innerText.trim() && !/сопроводительн/i.test(s.innerText));
      const groups = heads.map(() => []);
      for (const f of all) {
        let idx = -1;
        heads.forEach((hd, i) => {
          if (hd.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) idx = i;
        });
        if (idx >= 0) groups[idx].push(f);
      }
      questions = heads.map((hd, i) => (groups[i].length ? buildQuestion(hd.innerText.trim(), groups[i], form, null) : null)).filter(Boolean);
    }
    if (!questions.length) return null;
    questions.forEach((q, i) => (q.n = i + 1));
    return { form, questions };
  }

  // Что мы вставили сами: так отличаем наш текст от текста пользователя и не затираем его.
  const inserted = new WeakMap();

  function fillOpen(q, text) {
    const el = q.fields.find((f) => f.tagName === 'TEXTAREA' || f.type === 'text');
    if (!el) return 'no_field';
    const cur = el.value || '';
    if (cur.trim() && inserted.get(el) !== cur) return 'skipped';
    el.focus();
    setValue(el, q.limit ? text.slice(0, q.limit) : text);
    inserted.set(el, el.value);
    return 'filled';
  }

  function fillChoice(q, choice) {
    if (!q.options.length || !choice.length) return 'no_field';
    const first = q.options[0].el;
    if (first.tagName === 'OPTION') {
      const sel = q.fields.find((f) => f.tagName === 'SELECT');
      if (sel.value && inserted.get(sel) !== sel.value) return 'skipped';
      sel.value = q.options[choice[0] - 1].el.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      inserted.set(sel, sel.value);
      return 'filled';
    }
    const els = q.options.map((o) => o.el);
    if (els.some((e) => e.checked) && !els.some((e) => inserted.has(e))) return 'skipped';
    if (q.type === 'single') {
      const el = els[choice[0] - 1];
      if (!el.checked) el.click();
      els.forEach((e) => inserted.set(e, true));
    } else {
      els.forEach((el, i) => {
        if (el.checked !== choice.includes(i + 1)) el.click();
        inserted.set(el, true);
      });
    }
    return 'filled';
  }

  function applyAnswers(scan, answers) {
    return scan.questions.map((q) => {
      const a = (answers || []).find((x) => x.n === q.n) || { needsUser: true, unsupported: [] };
      let status = 'needs_user';
      if (!a.needsUser) status = q.type === 'open' ? fillOpen(q, a.text) : fillChoice(q, a.choice);
      return { q, a, status };
    });
  }

  const QA_STATUS = {
    filled: 'вставлено в поле',
    skipped: 'в поле уже есть ваш текст, не тронуто',
    needs_user: 'нужен ваш ответ: в резюме, фактах и правилах нет опоры',
    no_field: 'поле для ответа не найдено на странице'
  };

  function answerPreview(q, a) {
    if (a.needsUser) return '';
    if (q.type === 'open') return a.text.length > 300 ? a.text.slice(0, 300) + '…' : a.text; // полный текст уже в поле
    return (a.choice || []).map((i) => q.options[i - 1] && q.options[i - 1].text).filter(Boolean).join('; ');
  }

  function renderQa(items) {
    const filled = items.filter((x) => x.status === 'filled').length;
    qaBox.replaceChildren(
      h('h3', {}, 'Вопросы работодателя'),
      h('div', { class: 'meta' }, 'Вопросов: ' + items.length + ', вставлено ответов: ' + filled + '. Отклик не отправлен: проверьте ответы и отправьте его сами.'),
      ...items.map(({ q, a, status }) => {
        const prev = answerPreview(q, a);
        return h(
          'div',
          { class: 'qa-item' },
          h('div', { class: 'qa-q' }, q.n + '. ' + q.text),
          prev ? h('div', { class: 'qa-a' }, prev) : null,
          h('div', { class: 'qa-s' + (status === 'filled' ? '' : ' warn') }, QA_STATUS[status] || status),
          a.unsupported && a.unsupported.length ? h('div', { class: 'qa-s warn' }, 'Проверьте, нет опоры в ваших фактах: ' + a.unsupported.join('; ')) : null
        );
      }),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => runAnswers() }, 'Подобрать заново'))
    );
  }

  let qaBusy = false;
  let qaSig = '';
  let qaScan = null;

  async function runAnswers() {
    if (qaBusy || !qaScan) return;
    qaBusy = true;
    btnQa.disabled = true;
    qaBox.replaceChildren(h('h3', {}, 'Вопросы работодателя'), h('div', { class: 'meta' }, 'Подбираю ответы на вопросы (' + qaScan.questions.length + ')…'));
    try {
      const vac = await getVacancy();
      const payload = qaScan.questions.map((q) => ({ n: q.n, text: q.text, type: q.type, limit: q.limit, options: q.options.map((o) => o.text) }));
      const r = await send({ type: 'answers', vacancy: vac, questions: payload });
      if (!r.ok) {
        qaBox.replaceChildren(
          h('h3', {}, 'Вопросы работодателя'),
          h('div', { class: 'error' }, r.error),
          h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => runAnswers() }, 'Повторить'))
        );
        return;
      }
      qaScan = scanTestForm(await getTestMeta()) || qaScan; // поля могли перерисоваться
      renderQa(applyAnswers(qaScan, r.data.answers));
    } catch (e) {
      qaBox.replaceChildren(h('h3', {}, 'Вопросы работодателя'), h('div', { class: 'error' }, 'Ошибка: ' + e.message));
    } finally {
      qaBusy = false;
      btnQa.disabled = false;
    }
  }

  async function detectForm() {
    if (qaBusy || !(isResponsePage() || /\/vacancy\/\d+/.test(location.pathname))) return;
    if (!document.querySelector('[name^="task_"]') && !(isResponsePage() && document.querySelector('form strong'))) return;
    const scan = scanTestForm(await getTestMeta());
    if (!scan) return;
    const sig = scan.questions.map((q) => q.text).join('|');
    if (sig === qaSig) return;
    qaSig = sig;
    qaScan = scan;
    btnQa.style.display = '';
    let s = settingsCache;
    if (!s) {
      try {
        s = await loadSettings();
      } catch (e) {}
    }
    const a = (s && s.answers) || {};
    if (a.enabled === false) return;
    if (a.auto === false) {
      qaBox.replaceChildren(
        h('h3', {}, 'Вопросы работодателя'),
        h('div', { class: 'meta' }, 'Найдено вопросов: ' + scan.questions.length + '. Нажмите «Ответить на вопросы», чтобы подобрать ответы.')
      );
      return;
    }
    runAnswers();
  }

  // На странице отклика нет смысла в оценке вакансии и подсветке
  function applyPageMode() {
    const resp = isResponsePage();
    btnAnalyze.style.display = resp ? 'none' : '';
    legendEl.style.display = resp ? 'none' : '';
  }

  // ---------- модель и лимиты ----------

  const nfRu = new Intl.NumberFormat('ru-RU');
  const fmtTokens = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' млн';
    if (n >= 1e4) return nfRu.format(Math.round(n / 1000)) + ' тыс.';
    return nfRu.format(Math.round(n));
  };
  const fmtMoney = (x) => '$' + (Math.abs(x) < 1 ? x.toFixed(3) : x.toFixed(2));

  // Счётчик запросов OpenRouter обнуляется в 00:00 UTC: показываем это время по часам пользователя
  function nextResetLocal() {
    const d = new Date();
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
    return t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  // Компактная строка: подпись, полоса, проценты, значение. Подробности в подсказке при наведении.
  function limitRow(label, percent, val, title) {
    const p = Math.max(0, Math.min(100, percent));
    const tone = p >= 50 ? 'ok' : p >= 20 ? 'mid' : 'low';
    const fill = h('div', { class: 'bar-fill ' + tone });
    fill.style.width = p + '%';
    const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p)) }, fill);
    return h('div', { class: 'lim', title: title || '' }, h('span', { class: 'lim-lab' }, label), bar, h('span', { class: 'bar-pct' }, Math.round(p) + '%'), h('span', { class: 'lim-val' }, val));
  }

  const noteLine = (text, title, warn) => h('div', { class: 'lim-note' + (warn ? ' warn' : ''), title: title || text }, text);

  function limitsBlocks(r) {
    if (r.error) return [noteLine(r.error, r.error, true)];
    const out = [];
    const notes = [];
    const details = [];
    if (r.isFree) {
      if (r.requests) {
        out.push(limitRow('Запросы', r.requests.percent, nfRu.format(r.requests.remaining) + ' из ' + nfRu.format(r.requests.limit), 'Запросы к бесплатным моделям на сегодня. Счётчик обнулится в ' + nextResetLocal() + '.'));
        notes.push('сброс ' + nextResetLocal());
      } else {
        notes.push('счётчик запросов недоступен');
      }
      notes.push('токены без лимита');
      details.push('У бесплатной модели нет лимита по токенам.');
    } else {
      notes.push('запросы без лимита');
      details.push('У платных моделей нет лимита запросов.');
      const c = r.credits;
      if (c && r.tokensLeft !== null) {
        const src = c.source === 'account' ? 'баланс аккаунта' : c.source === 'budget' ? 'бюджет' : 'лимит ключа';
        out.push(limitRow('Токены', c.percent, '≈ ' + fmtTokens(r.tokensLeft), 'Оценка: остаток кредитов (' + fmtMoney(c.remaining) + ' из ' + fmtMoney(c.limit) + ', ' + src + ') ÷ средняя цена токена. OpenRouter считает деньги, а не токены.'));
        notes.push(fmtMoney(c.remaining) + ' из ' + fmtMoney(c.limit));
      } else if (c) {
        out.push(limitRow('Кредиты', c.percent, fmtMoney(c.remaining) + ' из ' + fmtMoney(c.limit), 'Оценка токенов появится после первого платного запроса.'));
      } else {
        notes.push('остаток кредитов недоступен');
      }
    }
    if (r.today && r.today.requests) {
      notes.push('сегодня ' + nfRu.format(r.today.tokens) + ' ток.');
      details.push('Потрачено расширением сегодня: ' + nfRu.format(r.today.tokens) + ' токенов за ' + nfRu.format(r.today.requests) + ' запросов.');
    }
    if (notes.length) out.push(noteLine(notes.join(' · '), notes.join('\n') + (details.length ? '\n' + details.join(' ') : '')));
    return out;
  }

  let modelBoxSeq = 0;
  async function renderModelBox(force) {
    const seq = ++modelBoxSeq;
    let s = settingsCache;
    if (!s) {
      try {
        s = await loadSettings();
      } catch (e) {
        return;
      }
    }
    if (s.showModelInfo === false) {
      // блок выключен в настройках: ничего не показываем и не обращаемся к OpenRouter
      modelBox.style.display = 'none';
      modelBox.replaceChildren();
      return;
    }
    modelBox.style.display = '';
    const info = providerInfo(s.provider);
    const refresh = h('button', { class: 'link', title: 'Обновить лимиты', onclick: () => renderModelBox(true) }, 'обновить');
    const head = h(
      'div',
      { class: 'model-line' },
      h('span', { class: 'model-k' }, 'Модель:'),
      h('b', { class: 'model-name' + (info.kind === 'none' ? ' warn' : ''), title: info.kind === 'openrouter' ? info.model : info.title }, info.label),
      info.kind === 'local' ? h('span', { class: 'model-sub', title: info.sub }, info.sub) : null,
      info.kind === 'openrouter' ? refresh : null
    );
    if (!modelBox.firstChild) modelBox.replaceChildren(head);
    if (info.kind !== 'openrouter') {
      modelBox.replaceChildren(head);
      return;
    }
    const r = await send({ type: 'openrouterStatus', force: !!force });
    if (seq !== modelBoxSeq) return; // пришёл более свежий запрос
    modelBox.replaceChildren(head, ...(r.ok ? limitsBlocks(r.data) : [noteLine(r.error, r.error, true)]));
  }

  let usageTimer = null;
  const scheduleModelBox = () => {
    clearTimeout(usageTimer);
    usageTimer = setTimeout(() => renderModelBox(true), 2500); // после серии запросов к модели
  };

  // ---------- линии от критериев в панели до подсвеченных мест ----------

  const linesEnabled = () => !!(settingsCache && settingsCache.highlight && settingsCache.highlight.lines === true);
  let linesRaf = 0;
  function scheduleLines() {
    if (linesRaf) return;
    linesRaf = requestAnimationFrame(() => {
      linesRaf = 0;
      drawLines();
    });
  }

  // Линия рисуется только когда на экране видны и пункт в панели, и подсвеченное место в тексте.
  // При прокрутке страницы или списка в панели линии появляются и исчезают.
  function drawLines() {
    linesSvg.replaceChildren();
    if (!linesEnabled() || !lastAnalysis || isResponsePage()) return;
    if (document.documentElement.classList.contains('hha-off') || panel.classList.contains('collapsed') || host.style.display === 'none') return;
    const body = panel.querySelector('.body');
    const bodyRect = body.getBoundingClientRect();
    const panelLeft = panel.getBoundingClientRect().left;
    const vh = window.innerHeight;
    for (const li of result.querySelectorAll('li[data-hha]')) {
      const tag = li.getAttribute('data-hha');
      const lr = li.getBoundingClientRect();
      const cy = lr.top + Math.min(lr.height / 2, 14); // точка у первой строки пункта
      if (cy < bodyRect.top + 4 || cy > bodyRect.bottom - 4) continue; // пункт прокручен за пределы панели
      let target = null;
      let kind = 'warn';
      for (const m of document.querySelectorAll('mark.hha-mark[data-hha-tag="' + tag + '"]')) {
        for (const r of m.getClientRects()) {
          if (r.height > 0 && r.bottom > 0 && r.top < vh && r.left >= 0 && r.right < panelLeft - 6) {
            target = r;
            kind = m.classList.contains('hha-crit') ? 'crit' : m.classList.contains('hha-good') ? 'good' : 'warn';
            break;
          }
        }
        if (target) break;
      }
      if (!target) continue; // место сейчас не видно на экране
      const x1 = target.right;
      const y1 = target.top + target.height / 2;
      linesSvg.append(
        svgEl('line', { class: 'ln l-' + kind, x1, y1, x2: lr.left, y2: cy }),
        svgEl('circle', { class: 'dot l-' + kind, cx: x1, cy: y1, r: 2.5 })
      );
    }
  }

  // ---------- интерфейс ----------

  function build() {
    host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    root.append(h('style', {}, CSS));

    status = h('div', { class: 'status' });
    result = h('div');
    btnAnalyze = h('button', { class: 'btn', onclick: onAnalyze }, 'Оценить вакансию');
    btnLetter = h('button', { class: 'btn ghost', onclick: onLetter }, 'Написать письмо');
    btnQa = h('button', { class: 'btn ghost', onclick: () => runAnswers() }, 'Ответить на вопросы');
    btnQa.style.display = 'none';
    qaBox = h('div', { class: 'qa' });
    modelBox = h('div', { class: 'model' });

    const collapse = h('button', { 'aria-label': 'Свернуть или развернуть', onclick: () => panel.classList.toggle('collapsed') }, '—');
    const settings = h('button', { class: 'link', onclick: () => send({ type: 'options' }) }, 'Настройки');
    const toggle = h(
      'button',
      {
        class: 'link',
        onclick: () => {
          const off = document.documentElement.classList.toggle('hha-off');
          toggle.textContent = off ? 'Показать подсветку' : 'Скрыть подсветку';
        }
      },
      'Скрыть подсветку'
    );
    const legend = h(
      'div',
      { class: 'legend' },
      h('span', { class: 'chip crit' }, 'критично'),
      h('span', { class: 'chip warn' }, 'под вопросом'),
      h('span', { class: 'chip good' }, 'плюс'),
      toggle
    );

    panel = h(
      'div',
      { class: 'panel' },
      h('div', { class: 'head' }, h('span', {}, 'Помощник по вакансии'), h('span', {}, settings, ' ', collapse)),
      h('div', { class: 'body' }, modelBox, h('div', { class: 'row' }, btnAnalyze, btnLetter, btnQa), legend, status, qaBox, result)
    );
    legendEl = legend;
    linesSvg = svgEl('svg', { class: 'links', 'aria-hidden': 'true' });
    root.append(panel, linesSvg);
    panel.querySelector('.body').addEventListener('scroll', scheduleLines, { passive: true });
    document.documentElement.append(host);
  }

  function setBusy(busy, msg) {
    btnAnalyze.disabled = busy;
    btnLetter.disabled = busy;
    status.className = 'status';
    status.textContent = msg || '';
  }

  function showError(msg) {
    status.className = 'error';
    status.textContent = msg;
  }

  function list(title, items, cls) {
    if (!items.length) return null;
    return h('div', {}, h('h4', {}, title), h('ul', {}, ...items));
  }

  function quoteLine(q, ok) {
    if (!q) return null;
    return h('div', { class: 'quote' }, '«' + q + '»', ok === false ? h('span', { class: 'warn' }, ' (цитата не найдена в тексте, проверьте)') : null);
  }

  function renderAnalysis(d) {
    result.replaceChildren(
      ...[
      h('div', { class: 'verdict' }, h('b', { class: d.verdict }, VERDICT[d.verdict] || d.verdict), h('span', {}, d.score + ' из 100')),
      d.mode ? h('div', { class: 'meta' }, 'Режим оценки: ' + (d.mode === 'strict' ? 'строгий, только по вашим критериям' : 'свободный')) : null,
      d.stop ? h('div', { class: 'warn' }, 'Сработал стоп-фактор из ваших критериев.') : null,
      d.warning ? h('div', { class: 'warn' }, d.warning) : null,
      h('p', {}, d.summary),
      list(
        'Против',
        d.cons.map((c, i) => h('li', { class: 'con', 'data-hha': 'c' + i }, c.point + (c.severity ? ' (' + (SEVERITY[c.severity] || c.severity) + ')' : ''), quoteLine(c.quote, c.quoteOk))),
      ),
      list('За', d.pros.map((p, i) => h('li', { class: 'pro', 'data-hha': 'p' + i }, p.point, quoteLine(p.quote, p.quoteOk)))),
      list('В вакансии не указано', d.unknown.map((u) => h('li', { class: 'unk' }, u)))
      ].filter(Boolean) // пустые блоки (null) не должны выводиться как текст «null»
    );
  }

  function countWords(s) {
    return (s.trim().match(/\S+/g) || []).length;
  }

  function renderLetter(d) {
    const area = h('textarea', { 'aria-label': 'Текст сопроводительного письма' });
    area.value = d.letter;
    const count = h('div', { class: 'meta' });
    const upd = () => (count.textContent = 'Слов: ' + countWords(area.value));
    area.addEventListener('input', upd);
    upd();

    const note = h('div', { class: 'status' });
    const insert = h(
      'button',
      {
        class: 'btn',
        onclick: async () => {
          const field = findLetterField();
          if (field) {
            field.focus();
            setValue(field, area.value);
            note.textContent = 'Текст вставлен. Проверьте и отправьте отклик сами.';
          } else {
            try {
              await navigator.clipboard.writeText(area.value);
            } catch (e) {}
            note.textContent = 'Поле письма не найдено. Откройте форму отклика и нажмите «Вставить» ещё раз. Текст скопирован в буфер.';
          }
        }
      },
      'Вставить в форму'
    );
    const copy = h(
      'button',
      {
        class: 'btn ghost',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(area.value);
            note.textContent = 'Скопировано.';
          } catch (e) {
            note.textContent = 'Не удалось скопировать, выделите текст вручную.';
          }
        }
      },
      'Копировать'
    );

    result.replaceChildren(
      d.unsupported.length
        ? h(
            'div',
            {},
            h('h4', {}, 'Проверьте: нет опоры в ваших фактах'),
            h('ul', {}, ...d.unsupported.map((u) => h('li', { class: 'unk' }, u)))
          )
        : h('div', { class: 'meta' }, 'Все утверждения нашли опору в вашем резюме и фактах.'),
      area,
      count,
      h('div', { class: 'row' }, insert, copy),
      note
    );
  }

  // ---------- духотометр ----------

  const TONE_NAMES = {
    1: 'Очень Дружелюбный',
    2: 'В основном Дружелюбный',
    3: 'Нейтральный',
    4: 'Строгий и Требовательный',
    5: 'Душный и Враждебный'
  };
  const GAUGE_COLORS = ['#009000', '#8ab800', '#ffdd00', '#ff8c00', '#ff0000'];
  const GAUGE_ANGLES = { 1: -80, 2: -40, 3: 0, 4: 40, 5: 80 };

  const TONE_TITLES = {
    1: [
      'Синхронизация на атомарном уровне.', 'Поймали абсолютный дзен на двоих.', 'Читаем мысли друг друга по губам.',
      'Братство кольца в сборе.', 'Любовь с первого промпта.', 'Вайб плюшевого пледа и какао.',
      'Градус душевности зашкаливает.', 'Атмосфера обнимашек и поддержки.', 'Максимально плюсовая температура.',
      'Уютно, как у бабушки на даче.', 'Клуб взаимного обожания открыт.', 'Готовы делиться последней чипсиной.',
      'Уровень токсичности: минус бесконечность.', 'Хоть к ране прикладывай.', 'Растопили бы даже айсберг.'
    ],
    2: [
      'Мосты дружбы наведены.', 'Вектор на взаимные уступки.', 'Встречное движение без мигалок',
      'Поиск золотой середины активирован', 'План «взаимное перемирие»', 'Повеяло майским теплом',
      'Градус дружелюбия пополз вверх', 'Атмосфера костра и гитары', 'Лёд не просто тронулся, он растаял',
      'Уютно, как в любимых тапочках', 'Поймали общий вайб.', 'Синхронизация часов прошла успешно.',
      'Мыслим в одном направлении.', 'Почти сошлись характерами.', 'Консенсус уже на горизонте.'
    ],
    3: [
      'Классический нормис-кор.', 'Максимально базовый уровень.', 'По ГОСТу и техпаспорту.',
      'Сферический стандарт в вакууме.', 'Абсолютный дефолт.', 'Градусник показывает ровно ноль.',
      'Ни тепло, ни холодно, а серо.', 'Режим «ровное дыхание».', 'Эмоциональное плато.',
      'Кардиограмма без пульса.', 'Вкусовые свойства картофельного пюре без соли', 'Атмосфера обоев под покраску',
      'Стабильно, как прогноз погоды в пустыне', 'Просто ок', 'Без ГМО и спецэффектов'
    ],
    4: [
      'Повеяло академической прохладой.', 'Кажется, здесь нужен легкий бриз', 'Атмосфера немного сгустилась',
      'Включаем режим микропроветривания', 'Градус серьезности пополз вверх', 'Курс углубленного погружения',
      'Погружение в текстуры', 'Включился режим максимальной детализации', 'Проснулся внутренний перфекционист',
      'Разговор ушел на молекулярный уровень', 'Слишком много букв на квадратный метр', 'Клуб любителей инструкций',
      'Проверка на усидчивость', 'Вечер занимательных фактов', 'Слишком серьезно для {день}'
    ],
    5: [
      'Пора открывать форточку', 'Сквозняк ушел по собственному желанию',
      'Концентрация углекислого газа превысила норму приличия', 'Вентилятор вышел из чата',
      'Срочно несите кислородную маску.', 'Берет на удушающий', 'Приступ спонтанного засыпания',
      'Уровень душноты: глаза начинают кровоточить', 'Уши сворачиваются в трубочку', 'Аура, несовместимая с жизнью',
      'Атмосфера ЖЭКа в час пик', 'Концерт духовых инструментов без антракта', 'Парад занудства на выезде',
      'Интеллектуальный парник', 'Филиал душного ада на земле'
    ]
  };

  // Заголовок стабилен для одной вакансии (повторная оценка не меняет его), но разный у разных вакансий.
  function pickToneTitle(level, url) {
    const list = TONE_TITLES[level] || TONE_TITLES[3];
    let hash = 0;
    for (const ch of String(url || '') + level) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const day = ['воскресенья', 'понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы'][new Date().getDay()];
    return list[hash % list.length].replace('{день}', day);
  }

  function svgEl(name, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
  }

  function buildGauge(level) {
    const cx = 110, cy = 105, R = 95, r = 58;
    const pt = (rad, deg) => [cx + rad * Math.cos((deg * Math.PI) / 180), cy - rad * Math.sin((deg * Math.PI) / 180)];
    const svg = svgEl('svg', {
      class: 'gauge', viewBox: '0 0 220 120', role: 'img',
      'aria-label': 'Духотометр: уровень ' + level + ' из 5, ' + TONE_NAMES[level]
    });
    GAUGE_COLORS.forEach((color, i) => {
      const a0 = 180 - i * 36, a1 = a0 - 36;
      const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
      svg.append(svgEl('path', {
        d: 'M' + x0 + ' ' + y0 + ' A' + R + ' ' + R + ' 0 0 1 ' + x1 + ' ' + y1 +
           ' L' + x2 + ' ' + y2 + ' A' + r + ' ' + r + ' 0 0 0 ' + x3 + ' ' + y3 + ' Z',
        fill: color
      }));
    });
    const needle = svgEl('polygon', { class: 'needle', points: (cx - 4) + ',' + cy + ' ' + cx + ',' + (cy - 68) + ' ' + (cx + 4) + ',' + cy });
    needle.style.transform = 'rotate(-90deg)';
    svg.append(needle, svgEl('circle', { class: 'hub', cx, cy, r: 8 }));
    requestAnimationFrame(() => requestAnimationFrame(() => (needle.style.transform = 'rotate(' + GAUGE_ANGLES[level] + 'deg)')));
    return svg;
  }

  // Прожарка: критический разбор и вопросы рекрутёру
  function renderRoast(d, vac) {
    const r = d.roast;
    if (!r.questions.length) {
      return h('div', { class: 'roast' }, h('h4', {}, 'Прожарка вакансии'), h('div', { class: 'meta' }, 'Модель не сформулировала вопросы. Нажмите «Оценить вакансию» ещё раз или выберите модель посильнее.'));
    }
    const note = h('div', { class: 'status' });
    const copy = h(
      'button',
      {
        class: 'btn ghost',
        onclick: async () => {
          const text =
            'Вопросы по вакансии' + (vac && vac.title ? ' «' + vac.title + '»' : '') + ':\n' +
            r.questions.map((q, i) => (i + 1) + '. ' + q.question).join('\n');
          try {
            await navigator.clipboard.writeText(text);
            note.textContent = 'Вопросы скопированы.';
          } catch (e) {
            note.textContent = 'Не удалось скопировать, выделите текст вручную.';
          }
        }
      },
      'Копировать вопросы'
    );
    return h(
      'div',
      { class: 'roast' },
      h('h4', {}, 'Прожарка вакансии'),
      r.summary ? h('p', { class: 'tone-text' }, r.summary) : null,
      h('div', { class: 'tone-title' }, 'Вопросы рекрутёру'),
      h(
        'ol',
        {},
        ...r.questions.map((q) =>
          h(
            'li',
            {},
            h('div', { class: 'rq-q' }, q.topic ? h('span', { class: 'rq-tag' + (q.priority === 'high' ? ' high' : '') }, q.priority === 'high' ? q.topic + ', важно' : q.topic) : null, q.question),
            q.why ? h('div', { class: 'rq-why' }, q.why) : null
          )
        )
      ),
      h('div', { class: 'row' }, copy),
      note
    );
  }

  function renderTone(box, d, url, vac) {
    const level = d.level;
    box.replaceChildren(
      h('h3', {}, 'Духотометр'),
      h('div', { class: 'tone-row' }, buildGauge(level), h('div', { class: 'tone-label lv' + level }, TONE_NAMES[level])),
      h('div', { class: 'tone-title' }, pickToneTitle(level, url)),
      h('p', { class: 'tone-text' }, d.review || 'Рецензия не получена.'),
      d.roast ? renderRoast(d, vac) : null
    );
  }

  async function showTone(request, vac) {
    const box = h('div', { class: 'tone' }, h('h3', {}, 'Духотометр'), h('div', { class: 'meta' }, 'Читаю тон вакансии…'));
    result.append(box);
    const r = await request;
    if (!box.isConnected) return; // пользователь уже нажал другую кнопку
    if (!r.ok) {
      box.replaceChildren(h('h3', {}, 'Духотометр'), h('div', { class: 'error' }, r.error));
      return;
    }
    renderTone(box, r.data, vac.url, vac);
  }

  async function onAnalyze() {
    setBusy(true, 'Оцениваю вакансию…');
    result.replaceChildren();
    const vac = readVacancy();
    const wantTone = !(settingsCache && settingsCache.tone && settingsCache.tone.enabled === false);
    const toneRequest = wantTone ? send({ type: 'tone', vacancy: vac }) : null;
    const r = await send({ type: 'analyze', vacancy: vac });
    setBusy(false, '');
    if (!r.ok) return showError(r.error);
    renderAnalysis(r.data);
    if (toneRequest) showTone(toneRequest, vac);
    lastAnalysis = r.data;
    const st = applyAll();
    scheduleLines();
    if (st.found || st.missed) {
      status.textContent = 'Подсвечено на странице: ' + st.found + (st.missed ? '. Не нашлось в тексте: ' + st.missed : '');
    }
  }

  async function onLetter() {
    setBusy(true, 'Пишу письмо…');
    result.replaceChildren();
    const r = await send({ type: 'letter', vacancy: await getVacancy() });
    setBusy(false, '');
    if (!r.ok) return showError(r.error);
    renderLetter(r.data);
  }

  injectPageStyle();
  build();
  refresh();
  setTimeout(refresh, 2500); // страница могла дорисоваться
  applyPageMode();
  window.addEventListener('scroll', scheduleLines, { passive: true, capture: true });
  window.addEventListener('resize', scheduleLines);
  setInterval(() => {
    if (linesEnabled() && lastAnalysis) scheduleLines(); // страница могла сдвинуться (картинки, шрифты)
  }, 600);
  detectForm();
  setTimeout(detectForm, 1500);
  let qaTimer = null;
  new MutationObserver(() => {
    clearTimeout(qaTimer);
    qaTimer = setTimeout(detectForm, 500); // форма с вопросами может появиться позже загрузки страницы
  }).observe(document.body, { childList: true, subtree: true });
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) refresh();
      if (area === 'local' && changes.usageStats) scheduleModelBox();
    });
  } catch (e) {}

  // hh.ru может переключать вакансии без перезагрузки страницы
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    const onVacancy = /\/vacancy\/|\/applicant\/vacancy_response/.test(location.pathname);
    host.style.display = onVacancy ? '' : 'none';
    lastAnalysis = null;
    clearHighlights();
    qaSig = '';
    qaScan = null;
    qaBox.replaceChildren();
    btnQa.style.display = 'none';
    applyPageMode();
    if (onVacancy) {
      result.replaceChildren();
      status.textContent = '';
      setTimeout(refresh, 1200);
      setTimeout(detectForm, 800);
    }
  }, 1000);
})();
