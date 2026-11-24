importScripts('defaults.js');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }
  handle(msg).then(
    (data) => sendResponse({ ok: true, data }),
    (err) => sendResponse({ ok: false, error: String((err && err.message) || err) })
  );
  return true; // ответ придёт асинхронно
});

async function handle(msg) {
  const settings = await loadSettings();
  switch (msg && msg.type) {
    case 'ping':
      return ping(settings);
    case 'analyze':
      return analyze(settings, msg.vacancy);
    case 'letter':
      return writeLetter(settings, msg.vacancy);
    case 'tone':
      return analyzeTone(settings, msg.vacancy);
    case 'answers':
      return answerQuestions(settings, msg.vacancy, msg.questions);
    case 'openrouterStatus':
      return openrouterStatus(settings, msg.force === true);
    default:
      throw new Error('Неизвестная команда.');
  }
}

// ---------- учёт токенов и лимиты OpenRouter ----------

// Токены и стоимость берём из поля usage в ответе модели. Счётчик «сегодня» по UTC, как у лимитов OpenRouter.
let usageChain = Promise.resolve();
function recordUsage(provider, usage) {
  if (!usage) return;
  let host = '';
  try {
    host = new URL(provider.baseUrl).hostname.toLowerCase();
  } catch (e) {
    return;
  }
  const tokens = Number(usage.total_tokens) || (Number(usage.prompt_tokens) || 0) + (Number(usage.completion_tokens) || 0);
  const cost = Number(usage.cost) || 0;
  // запросы идут параллельно, поэтому записи ставятся в очередь
  usageChain = usageChain
    .then(async () => {
      const stored = await chrome.storage.local.get('usageStats');
      const all = stored.usageStats || {};
      const prev = all[host] || {};
      const day = new Date().toISOString().slice(0, 10);
      const same = prev.day === day;
      all[host] = {
        day,
        requests: (same ? prev.requests || 0 : 0) + 1,
        tokens: (same ? prev.tokens || 0 : 0) + tokens,
        cost: (same ? prev.cost || 0 : 0) + cost,
        // по платным запросам считаем среднюю цену токена, чтобы оценить остаток токенов по остатку кредитов
        paidTokens: (prev.paidTokens || 0) + (cost > 0 ? tokens : 0),
        paidCost: (prev.paidCost || 0) + (cost > 0 ? cost : 0)
      };
      await chrome.storage.local.set({ usageStats: all });
    })
    .catch(() => {});
}

let orCache = { at: 0, key: '', data: null };

async function fetchOpenrouterKey(origin, key) {
  const headers = { Authorization: 'Bearer ' + key };
  const res = await fetch(origin + '/api/v1/key', { headers });
  if (!res.ok) throw new Error('OpenRouter ответил ' + res.status + (res.status === 401 ? ': проверьте ключ API' : ''));
  const d = ((await res.json()) || {}).data || {};
  const num = (x) => typeof x === 'number' && Number.isFinite(x);

  // Кредиты: сначала самый строгий бюджет, потом лимит ключа, потом баланс аккаунта
  let credits = null;
  const eff = d.effective_budget;
  if (eff && num(eff.limit_usd) && eff.limit_usd > 0 && num(eff.remaining_usd)) {
    credits = { limit: eff.limit_usd, remaining: eff.remaining_usd, resetsAt: eff.resets_at || null, source: 'budget' };
  } else if (num(d.limit) && d.limit > 0 && num(d.limit_remaining)) {
    credits = { limit: d.limit, remaining: d.limit_remaining, resetsAt: null, source: 'key' };
  } else {
    try {
      const r2 = await fetch(origin + '/api/v1/credits', { headers });
      if (r2.ok) {
        const c = ((await r2.json()) || {}).data || {};
        if (num(c.total_credits) && c.total_credits > 0 && num(c.total_usage)) {
          credits = { limit: c.total_credits, remaining: c.total_credits - c.total_usage, resetsAt: null, source: 'account' };
        }
      }
    } catch (e) {}
  }
  if (credits) credits.percent = Math.max(0, Math.min(100, (credits.remaining / credits.limit) * 100));

  const f = d.free_model_daily_requests;
  let requests = null;
  if (f && num(f.limit) && f.limit > 0) {
    const remaining = Math.max(0, num(f.remaining) ? f.remaining : f.limit - (f.used || 0));
    requests = { used: f.used || 0, limit: f.limit, remaining, percent: Math.max(0, Math.min(100, (remaining / f.limit) * 100)) };
  }
  return { credits, requests };
}

// Что показать в панели про выбранную модель OpenRouter
async function openrouterStatus(settings, force) {
  const info = providerInfo(settings.provider);
  if (info.kind !== 'openrouter') return { kind: info.kind };
  const p = settings.provider;
  const isFree = /:free$/.test(info.model) || info.model === 'openrouter/free';
  const stored = await chrome.storage.local.get('usageStats');
  const st = (stored.usageStats || {})[info.host] || {};
  const today = st.day === new Date().toISOString().slice(0, 10) ? { tokens: st.tokens || 0, requests: st.requests || 0 } : { tokens: 0, requests: 0 };
  const out = { kind: 'openrouter', isFree, today, requests: null, credits: null, tokensLeft: null, error: '' };
  if (!p.apiKey) {
    out.error = 'Ключ API не указан в настройках.';
    return out;
  }
  const now = Date.now();
  const fresh = orCache.data && orCache.key === p.apiKey && now - orCache.at < (force ? 4000 : 60000);
  try {
    if (!fresh) orCache = { at: now, key: p.apiKey, data: await fetchOpenrouterKey(new URL(p.baseUrl).origin, p.apiKey) };
  } catch (e) {
    out.error = 'Не удалось получить лимиты: ' + e.message;
    return out;
  }
  out.requests = orCache.data.requests;
  out.credits = orCache.data.credits;
  // У OpenRouter нет лимита токенов. Оценка: остаток кредитов ÷ средняя цена токена по нашим платным запросам.
  const price = st.paidTokens > 0 ? st.paidCost / st.paidTokens : 0;
  if (!isFree && out.credits && price > 0) out.tokensLeft = Math.round(Math.max(0, out.credits.remaining) / price);
  return out;
}

// ---------- работа с моделью (любой OpenAI-совместимый API) ----------

async function chat(settings, messages) {
  const p = settings.provider;
  if (!p.baseUrl || !p.model) {
    throw new Error('Откройте настройки расширения и укажите адрес API и название модели.');
  }
  const url = p.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (p.apiKey) headers.Authorization = 'Bearer ' + p.apiKey;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: p.model, messages, temperature: 0.3 })
    });
  } catch (e) {
    throw new Error('Не удалось связаться с ' + url + '. Проверьте адрес и нажмите «Проверить подключение» в настройках.');
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('Ошибка API ' + res.status + ': ' + t.slice(0, 300));
  }
  const j = await res.json();
  recordUsage(settings.provider, j && j.usage); // учёт токенов из ответа модели (usage accounting)
  const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!content) throw new Error('Модель вернула пустой ответ.');
  return String(content).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, '');
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  const fail = () =>
    new Error('Модель ответила не в формате JSON. Попробуйте ещё раз или выберите модель посильнее.');
  if (a < 0 || b < a) throw fail();
  try {
    return JSON.parse(cleaned.slice(a, b + 1));
  } catch (e) {
    throw fail();
  }
}

async function ping(settings) {
  return chat(settings, [{ role: 'user', content: 'Ответь одним словом: ок' }]);
}

// ---------- вспомогательное ----------

function vacancyText(v) {
  const parts = [
    'Название: ' + (v.title || 'не определено'),
    'Компания: ' + (v.company || 'не определена'),
    'Зарплата: ' + (v.salary || 'не указана')
  ];
  if (v.meta) parts.push('Условия: ' + v.meta);
  parts.push('', v.text || '');
  return parts.join('\n').slice(0, 14000);
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Преобладает ли в тексте кириллица (бесплатные модели иногда срываются на английский)
function mostlyRussian(s) {
  const t = String(s || '');
  const cyr = (t.match(/[а-яё]/gi) || []).length;
  const lat = (t.match(/[a-z]/gi) || []).length;
  return cyr >= lat;
}

// Ключевые слова критериев, найденные в тексте. id совпадает с номером критерия в запросе к модели.
function keywordHits(list, text) {
  const low = text.toLowerCase();
  const hits = [];
  list.forEach((r, idx) => {
    const words = String(r.keywords || '')
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    let n = 0;
    for (const w of words) {
      const i = low.indexOf(w);
      if (i >= 0 && n < 2) {
        hits.push({ id: idx + 1, rule: r.text, keyword: w, context: text.slice(Math.max(0, i - 60), i + w.length + 60).replace(/\s+/g, ' ') });
        n++;
      }
    }
  });
  return hits;
}

function formatFacts(facts) {
  const list = facts.filter((f) => f.title || f.situation || f.actions || f.result);
  if (!list.length) return '(фактов нет)';
  return list
    .map((f, i) =>
      [
        'Факт ' + (i + 1) + ': ' + (f.title || ''),
        f.situation ? '  Ситуация: ' + f.situation : '',
        f.actions ? '  Действия: ' + f.actions : '',
        f.result ? '  Результат: ' + f.result : '',
        f.tags ? '  Теги: ' + f.tags : ''
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
}

// ---------- оценка вакансии ----------

// Строгий режим: оценка считается программой из найденных критериев, а не «на глаз» моделью.
const STRICT_BASE = 50;
const STRICT_DELTA = { minus: { high: -25, mid: -15, low: -7 }, plus: { high: 20, mid: 12, low: 6 } };

const activeRules = (rules) => (rules || []).filter((r) => r.text && r.text.trim());
const firstLine = (t) => String(t || '').trim().split('\n')[0].slice(0, 140);

// Ответ в JSON. Слабые модели часто промахиваются с форматом, поэтому один повтор.
async function chatJson(settings, messages) {
  const raw = await chat(settings, messages);
  try {
    return { raw, d: parseJson(raw) };
  } catch (e) {
    const raw2 = await chat(settings, [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: 'Ответ не в формате JSON. Верни только один JSON-объект строго в заданном формате, без пояснений.' }
    ]);
    return { raw: raw2, d: parseJson(raw2) };
  }
}

const CHECKLIST_RULES = [
  'ПРОВЕРКА КРИТЕРИЕВ. Для каждого критерия из списка верни запись в "criteria": {"id": номер критерия, "found": "yes" или "no", "quote": "цитата"}.',
  '- "found": "yes" означает ТОЛЬКО одно: то, что описано в критерии, ЕСТЬ в тексте вакансии (требуется, предлагается или прямо упоминается). Если в тексте этого нет, ставь "no". Если критерий сформулирован как отсутствие чего-то (например, «нет удалёнки»), "yes" ставь только когда вакансия прямо это утверждает.',
  '- Ты не оцениваешь, хорошо это или плохо: плюс это или минус, определяет программа. Отсутствие явления в тексте не является ни плюсом, ни минусом: просто "no".',
  '- Критерии применяй по смыслу, а не только по словам, но не домысливай: если не уверен, ставь "no".',
  '- Для "yes" приведи в "quote" дословную цитату из вакансии: один короткий фрагмент подряд из одного места текста (до 120 символов). Для "no" оставь "quote" пустым.'
];

async function analyze(settings, vacancy) {
  const strict = settings.evalMode === 'strict';
  const mode = strict ? 'strict' : 'free';
  const list = activeRules(settings.rules);
  const text = vacancyText(vacancy);

  if (strict && !list.length) {
    return {
      verdict: 'doubtful', score: STRICT_BASE, stop: false, summary: '', pros: [], cons: [], unknown: [], mode,
      warning: 'Строгий режим: критерии не заданы, оценивать нечем. Добавьте критерии в настройках или переключитесь на свободный режим.'
    };
  }

  const hits = keywordHits(list, text);
  const numbered = list.map((r, i) => (i + 1) + '. ' + r.text.trim().replace(/\n+/g, '\n   ')).join('\n');
  const hintsBlock = hits.length
    ? 'ПОДСКАЗКИ (в тексте найдены ключевые слова критериев; решение всё равно принимаешь ты по смыслу):\n' +
      hits.map((h) => '- критерий ' + h.id + ', слово «' + h.keyword + '»: …' + h.context + '…').join('\n')
    : '';

  let system;
  let user;
  if (strict) {
    system = [
      'Ты проверяешь вакансию по списку критериев соискателя. Отвечай только JSON, без текста вне JSON.',
      ...CHECKLIST_RULES,
      'Больше ничего не делай: не давай своих выводов, плюсов и минусов, не оценивай вакансию в целом.',
      'Формат ответа: {"criteria": [{"id": 1, "found": "no", "quote": ""}]}'
    ].join('\n');
    user = ['КРИТЕРИИ (проверь, есть ли каждое из описанных явлений в вакансии):', numbered, '', hintsBlock, '', 'ВАКАНСИЯ:', text].join('\n');
  } else {
    const attitude = list
      .map((r, i) => '- №' + (i + 1) + ': ' + (r.kind === 'plus' ? 'плюс' : r.kind === 'stop' ? 'стоп-фактор' : 'минус') + (r.kind === 'stop' ? '' : ' (' + ({ high: 'сильный', mid: 'средний', low: 'слабый' }[r.weight] || 'средний') + ')'))
      .join('\n');
    system = [
      'Ты помощник соискателя. Оцени вакансию. Отвечай только JSON, без текста вне JSON.',
      list.length ? 'ЧАСТЬ 1.' : '',
      ...(list.length ? CHECKLIST_RULES : []),
      'ЧАСТЬ ' + (list.length ? '2. ' : '') + 'СОБСТВЕННАЯ ОЦЕНКА.',
      '- Дай свою оценку вакансии на основании текста вакансии, критериев и резюме: "pros" и "cons" это твои собственные наблюдения. Не повторяй в них пункты проверки критериев.',
      '- Нельзя записывать в "cons" отсутствие того, что соискатель считает плюсом, и в "pros" отсутствие того, что он считает минусом: отсутствие чего-либо в тексте само по себе ничего не оценивает.',
      '- Опирайся только на текст вакансии. Если чего-то важного в тексте нет (зарплата, формат работы и т.п.), не додумывай: добавь это в "unknown".',
      '- К каждому пункту в "pros" и "cons" давай "quote": дословную цитату из вакансии, один короткий фрагмент подряд (до 120 символов). Если дословной цитаты нет, оставь "quote" пустым.',
      '- Для критичных минусов ставь "severity": "high", для средних "mid", для слабых "low".',
      '- ВСЕ текстовые поля ("summary", "point", "unknown") пиши строго на русском языке, даже если вакансия на другом языке. Только "quote" остаётся дословной, как в вакансии.',
      '- "score" от 0 до 100: насколько вакансия подходит соискателю.',
      'Формат ответа:',
      '{' + (list.length ? '"criteria": [{"id": 1, "found": "no", "quote": ""}], ' : '') + '"score": 0, "summary": "2-3 предложения", "pros": [{"point": "", "quote": ""}], "cons": [{"point": "", "quote": "", "severity": "low|mid|high"}], "unknown": [""]}'
    ].filter(Boolean).join('\n');
    user = [
      list.length ? 'КРИТЕРИИ (для части 1: проверь, есть ли каждое из описанных явлений в вакансии):\n' + numbered : '',
      list.length ? '\nОТНОШЕНИЕ СОИСКАТЕЛЯ К КРИТЕРИЯМ (только как контекст для твоей собственной оценки):\n' + attitude : '',
      settings.resume ? '\nРЕЗЮМЕ СОИСКАТЕЛЯ (кратко для контекста):\n' + settings.resume.slice(0, 3000) : '',
      '',
      hintsBlock,
      '',
      'ВАКАНСИЯ:',
      text,
      '',
      'Ответ дай строго на русском языке. Дословные цитаты из вакансии оставляй как в оригинале.'
    ].join('\n');
  }

  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  let { raw, d } = await chatJson(settings, messages);

  // Если модель пропустила раздел с критериями, просим один раз
  let criteriaMissing = false;
  if (list.length && !Array.isArray(d.criteria)) {
    try {
      const r2 = await chatJson(settings, [
        ...messages,
        { role: 'assistant', content: raw },
        { role: 'user', content: 'В ответе нет раздела "criteria". Верни JSON целиком, включая "criteria" со всеми критериями из списка.' }
      ]);
      if (Array.isArray(r2.d.criteria)) {
        d = r2.d;
        raw = r2.raw;
      }
    } catch (e) {}
    if (!Array.isArray(d.criteria)) {
      if (strict) throw new Error('Модель не проверила критерии. Попробуйте ещё раз или выберите модель посильнее.');
      criteriaMissing = true;
    }
  }

  if (!strict) {
    const ruText = (x) =>
      [x.summary, ...(x.pros || []).map((p) => p && p.point), ...(x.cons || []).map((c) => c && c.point), ...(x.unknown || [])].join(' ');
    if (!mostlyRussian(ruText(d))) {
      try {
        const r2 = await chatJson(settings, [
          ...messages,
          { role: 'assistant', content: raw },
          { role: 'user', content: 'Ответ написан не на русском. Верни тот же JSON, но "summary", "point" и "unknown" на русском языке. "quote" оставь дословным.' }
        ]);
        if (mostlyRussian(ruText(r2.d)) && (!list.length || Array.isArray(r2.d.criteria))) d = r2.d;
      } catch (e) {}
    }
  }

  const haystack = norm(text);
  const checkQuote = (item) => {
    const q = norm(item && item.quote);
    return { quote: (item && item.quote) || '', quoteOk: q ? haystack.includes(q) : null };
  };

  // Что сказала модель про каждый критерий. Полярность (плюс, минус, стоп) определяем здесь, не модель:
  // «нет в тексте» никогда не превращается ни в плюс, ни в минус.
  const answers = new Map();
  for (const c of Array.isArray(d.criteria) ? d.criteria : []) {
    const id = Number(c && c.id);
    if (Number.isInteger(id) && id >= 1 && id <= list.length) answers.set(id, c);
  }
  const pros = [];
  const cons = [];
  let stop = false;
  let delta = 0;
  let nPlus = 0;
  let nMinus = 0;
  list.forEach((r, i) => {
    const c = answers.get(i + 1);
    if (!c || String(c.found).trim().toLowerCase() !== 'yes') return;
    let quote = String(c.quote || '').trim();
    const hit = hits.find((h) => h.id === i + 1);
    if (!quote && !hit) return; // «да» без цитаты и без ключевого слова не засчитываем
    const qc = quote ? checkQuote({ quote }) : { quote: hit.keyword, quoteOk: true };
    if (qc.quoteOk === false && !hit) return; // выдуманная цитата, которой нет в тексте: критерий не засчитываем
    const base = { point: firstLine(r.text), quote: qc.quote, quoteOk: qc.quoteOk, source: 'criteria' };
    if (r.kind === 'plus') {
      pros.push(base);
      nPlus++;
      delta += STRICT_DELTA.plus[r.weight] || STRICT_DELTA.plus.mid;
    } else {
      const sev = r.kind === 'stop' ? 'high' : ['low', 'mid', 'high'].includes(r.weight) ? r.weight : 'mid';
      cons.push(Object.assign(base, { severity: sev }));
      if (r.kind === 'stop') stop = true;
      else {
        nMinus++;
        delta += STRICT_DELTA.minus[sev];
      }
    }
  });

  let score;
  let summary = '';
  let unknown = [];
  if (strict) {
    score = Math.max(0, Math.min(100, STRICT_BASE + delta));
    if (stop) score = Math.min(score, 20);
    const parts = [];
    if (!pros.length && !cons.length) parts.push('Ни один из ваших критериев в тексте вакансии не найден. Оценка нейтральная: отсутствие критерия ничего не добавляет и не отнимает.');
    else parts.push('Найдено в вакансии: минусов ' + nMinus + ', плюсов ' + nPlus + (stop ? ', сработал стоп-фактор' : '') + '. Оценка посчитана по вашим критериям и их весам.');
    summary = parts.join(' ');
  } else {
    score = Math.max(0, Math.min(100, Number(d.score) || 0));
    summary = String(d.summary || '');
    unknown = (Array.isArray(d.unknown) ? d.unknown : []).map(String);
    // собственные наблюдения модели, без повторов того, что уже найдено по критериям
    const taken = [...pros, ...cons].map((x) => norm(x.quote)).filter(Boolean);
    const dup = (item) => {
      const q = norm(item && item.quote);
      return !!q && taken.some((t) => t === q || t.includes(q) || q.includes(t));
    };
    for (const p of Array.isArray(d.pros) ? d.pros : []) {
      if (p && !dup(p)) pros.push(Object.assign({ point: String(p.point || ''), source: 'model' }, checkQuote(p)));
    }
    for (const c of Array.isArray(d.cons) ? d.cons : []) {
      if (c && !dup(c)) cons.push(Object.assign({ point: String(c.point || ''), severity: c.severity || 'mid', source: 'model' }, checkQuote(c)));
    }
  }

  let verdict = 'skip';
  if (!stop) verdict = score >= 75 ? 'apply' : score >= 55 ? 'lean_yes' : score >= 35 ? 'doubtful' : 'skip';

  let warning = '';
  if (!list.length) warning = 'Критерии не заданы: оценка получится общей. Добавьте их в настройках.';
  else if (criteriaMissing) warning = 'Модель не проверила критерии: показаны только её собственные наблюдения. Попробуйте ещё раз или включите строгий режим.';

  return { verdict, score, stop, summary, pros, cons, unknown, warning, mode };
}

// ---------- духотометр: тон текста вакансии ----------

// Прожарка: придирчивый разбор вакансии и вопросы рекрутёру. Идёт в том же запросе, что и тон.
const ROAST_RULES = [
  'ПРОЖАРКА (отдельная часть ответа, поле "roast"):',
  '- Здесь стань максимально критичным и придирчивым читателем этой вакансии: скептик, который ничему не верит на слово. Ищи белые пятна, недомолвки, размытые и противоречивые формулировки, завышенные ожидания, красивые слова без содержания и скрытые риски.',
  '- "summary": 2-4 предложения жёсткого, но по существу разбора: что в вакансии вызывает сомнения. Без оскорблений и без вывода «откликаться или нет».',
  '- "questions": от 6 до 12 вопросов рекрутёру, которые максимально закрывают белые пятна в понимании вакансии. Самые важные первыми.',
  '- Каждый вопрос конкретный (не «расскажите подробнее о компании»), его можно задать рекрутёру вслух или в сообщении, и он опирается на конкретное место вакансии или на то, чего в ней не хватает. Не задавай вопросов, ответ на которые уже есть в тексте. Не повторяйся.',
  '- "topic": короткая тема (деньги, обязанности, процессы, команда, условия работы, рост, риски и т.п.). "why": одно предложение о том, какое белое пятно закрывает вопрос. "priority": "high" для вопросов, без ответа на которые нельзя принимать решение, иначе "normal".',
  '- Если текста вакансии мало, спрашивай базовое: обязанности, условия, деньги, команду, процесс найма.',
  '- Все текстовые поля прожарки пиши на русском языке.'
];

function parseRoast(d) {
  const r = d && d.roast && typeof d.roast === 'object' ? d.roast : {};
  const raw = Array.isArray(r.questions) ? r.questions : Array.isArray(d && d.questions) ? d.questions : [];
  const questions = raw
    .map((q) => (typeof q === 'string' ? { question: q } : q))
    .filter((q) => q && String(q.question || '').trim())
    .slice(0, 15)
    .map((q) => ({
      topic: String(q.topic || '').trim(),
      question: String(q.question).trim(),
      why: String(q.why || '').trim(),
      priority: q.priority === 'high' ? 'high' : 'normal'
    }));
  return { summary: String(r.summary || '').trim(), questions };
}

async function analyzeTone(settings, vacancy) {
  const roastOn = settings.tone.roast === true;
  const system = [
    'Ты анализируешь только текст вакансии: его тон, а не соответствие какому-либо соискателю. Отвечай только JSON, без текста вне JSON.',
    roastOn ? 'ЧАСТЬ 1. ТОН ВАКАНСИИ (поля "level" и "review").' : '',
    'Оцени, насколько текст враждебен, требователен или, наоборот, дружелюбен и настроен на поиск компромиссов.',
    'Ищи признаки скрытой агрессии, пренебрежения или презрения к соискателям (например, «не тратьте наше время», «только для сильнейших», угрозы, упрёки, высокомерный тон), давление и культуру переработок, а также потенциальные скрытые проблемы при трудоустройстве (размытые обязанности и условия, обтекаемые формулировки, несоответствие требований и предложения).',
    'Ищи и обратное: уважение к кандидату, прозрачность условий, готовность к гибкости и компромиссам, заботу о людях.',
    'Шкала "level":',
    '1 — очень дружелюбный: тёплый тон, уважение, прозрачность, гибкость.',
    '2 — в основном дружелюбный: доброжелательно, есть готовность идти навстречу.',
    '3 — нейтральный: обычный деловой шаблон без заметной теплоты или враждебности.',
    '4 — строгий и требовательный: много жёстких требований, формальный или давящий тон, мало гибкости.',
    '5 — душный и враждебный: заметная скрытая агрессия, пренебрежение к кандидатам, давление, тревожные недомолвки.',
    'Правила:',
    '- Опирайся только на текст вакансии. Не додумывай. Если текста мало для вывода, поставь 3 и скажи об этом в рецензии.',
    '- "review": 2-4 предложения на русском языке. Назови конкретные приметы тона, при желании с короткими цитатами в кавычках «». Без оскорблений и без советов откликаться или нет.',
    ...(roastOn ? ['', ...ROAST_RULES] : []),
    roastOn
      ? 'Формат ответа: {"level": 3, "review": "текст", "roast": {"summary": "разбор", "questions": [{"topic": "деньги", "question": "вопрос рекрутёру", "why": "какое белое пятно закрывает", "priority": "high"}]}}'
      : 'Формат ответа: {"level": 3, "review": "текст"}'
  ].filter((x) => x !== '').join('\n');

  const user = 'ВАКАНСИЯ:\n' + vacancyText(vacancy) + '\n\nОтвет дай строго на русском языке.';
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  let { raw, d } = await chatJson(settings, messages);

  // Слабая модель могла забыть про прожарку: просим один раз
  if (roastOn && !parseRoast(d).questions.length) {
    try {
      const r2 = await chatJson(settings, [
        ...messages,
        { role: 'assistant', content: raw },
        { role: 'user', content: 'В ответе нет списка вопросов рекрутёру. Верни JSON целиком, включая поле "roast" с "summary" и "questions" (6-12 вопросов).' }
      ]);
      if (parseRoast(r2.d).questions.length) {
        d = r2.d;
        raw = r2.raw;
      }
    } catch (e) {}
  }

  const textOf = (x) => {
    const r = roastOn ? parseRoast(x) : { summary: '', questions: [] };
    return [x.review, r.summary, ...r.questions.map((q) => q.question + ' ' + q.why)].join(' ');
  };
  if (!mostlyRussian(textOf(d))) {
    try {
      const r2 = await chatJson(settings, [
        ...messages,
        { role: 'assistant', content: raw },
        { role: 'user', content: 'Ответ написан не на русском. Верни тот же JSON, но все текстовые поля ("review", "summary", "topic", "question", "why") на русском языке.' }
      ]);
      if (mostlyRussian(textOf(r2.d))) d = r2.d;
    } catch (e) {}
  }
  const level = Math.max(1, Math.min(5, Math.round(Number(d.level)) || 3));
  const out = { level, review: String(d.review || '').trim() };
  if (roastOn) out.roast = parseRoast(d);
  return out;
}

// ---------- ответы на вопросы работодателя ----------

function formatAnswerRules(rules) {
  const list = (rules || []).filter((r) => r.text && r.text.trim());
  if (!list.length) return '(нет)';
  return list
    .map((r) => {
      const topic = r.topic && r.topic.trim() ? ' (относится к вопросам про: ' + r.topic.trim() + ')' : ' (относится ко всем вопросам)';
      const body = r.text.trim().replace(/\n+/g, '\n  ');
      if (r.kind === 'ban') return '- ЗАПРЕТ' + topic + ': ' + body;
      if (r.kind === 'canned') {
        return '- ГОТОВЫЙ ОТВЕТ' + topic + ' (используй дословно или с минимальными правками под формулировку вопроса): ' + body;
      }
      return '- ПРАВИЛО' + topic + ': ' + body;
    })
    .join('\n');
}

function formatQuestions(questions) {
  return questions
    .map((q) => {
      const kind =
        q.type === 'open'
          ? 'открытый вопрос' + (q.limit ? ', не больше ' + q.limit + ' символов' : '')
          : q.type === 'multiple'
          ? 'выбор нескольких вариантов'
          : 'выбор одного варианта';
      const opts = (q.options || []).map((o, i) => '   ' + (i + 1) + ') ' + o).join('\n');
      return q.n + '. [' + kind + '] ' + q.text + (opts ? '\n' + opts : '');
    })
    .join('\n\n');
}

async function answerQuestions(settings, vacancy, questions) {
  questions = Array.isArray(questions) ? questions : [];
  if (!questions.length) throw new Error('Вопросы не найдены.');
  const A = settings.answers;
  const hasFacts = settings.facts.some((f) => f.title || f.situation || f.actions || f.result);
  const hasCanned = A.rules.some((r) => r.kind === 'canned' && r.text && r.text.trim());
  if (!hasFacts && !settings.resume.trim() && !hasCanned) {
    throw new Error('Добавьте в настройках резюме, факты или готовые ответы: ответы подбираются только по ним.');
  }

  const system = [
    'Ты помогаешь соискателю отвечать на вопросы работодателя в тесте к вакансии. Отвечай только JSON, без текста вне JSON.',
    'Правила:',
    '- Пиши от первого лица, от имени соискателя, по-русски. Тон: ' + settings.letter.tone + '.',
    '- Факты о себе бери только из блоков «Резюме» и «Факты» и из правил соискателя. Не придумывай опыт, компании, цифры, навыки и сроки.',
    '- Правила соискателя (ЗАПРЕТ, ПРАВИЛО, ГОТОВЫЙ ОТВЕТ) главнее всего остального. Если вопрос подходит под готовый ответ, используй его.',
    '- Если для ответа на открытый вопрос нет опоры в фактах, резюме и правилах, не придумывай: поставь "needs_user": true и пустой "text".',
    '- Для вопросов с вариантами укажи номера выбранных вариантов в "choice" (нумерация с 1): один номер для выбора одного варианта, несколько для множественного. Если честно выбрать нельзя, поставь "needs_user": true.',
    '- Если у вопроса указан лимит символов, уложись в него.',
    '- Ответ на открытый вопрос должен быть по существу вопроса и без вступлений вроде «Спасибо за вопрос».',
    'Формат ответа: {"answers": [{"n": 1, "text": "ответ", "needs_user": false}, {"n": 2, "choice": [1], "needs_user": false}]}'
  ].join('\n');

  const user = [
    'ПРАВИЛА СОИСКАТЕЛЯ:',
    formatAnswerRules(A.rules),
    '',
    'РЕЗЮМЕ:',
    settings.resume.trim() ? settings.resume.slice(0, 5000) : '(не заполнено)',
    '',
    'ФАКТЫ:',
    formatFacts(settings.facts),
    '',
    'ВАКАНСИЯ (для контекста):',
    vacancyText(vacancy || {}).slice(0, 6000),
    '',
    'ВОПРОСЫ РАБОТОДАТЕЛЯ:',
    formatQuestions(questions),
    '',
    'Ответ дай строго на русском языке.'
  ].join('\n');

  const raw = await chat(settings, [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]);
  let d = parseJson(raw);
  const textsOf = (x) => (Array.isArray(x.answers) ? x.answers : []).map((a) => (a && a.text) || '').join(' ');
  if (!mostlyRussian(textsOf(d))) {
    try {
      const raw2 = await chat(settings, [
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: raw },
        { role: 'user', content: 'Ответы написаны не на русском. Верни тот же JSON, но все "text" на русском языке.' }
      ]);
      const d2 = parseJson(raw2);
      if (mostlyRussian(textsOf(d2))) d = d2;
    } catch (e) {}
  }

  const byN = new Map();
  for (const a of Array.isArray(d.answers) ? d.answers : []) if (a) byN.set(Number(a.n), a);

  const answers = questions.map((q) => {
    const a = byN.get(q.n) || {};
    const needs = a.needs_user === true;
    if (q.type === 'open') {
      const text = String(a.text || '').trim();
      return { n: q.n, text, needsUser: needs || !text, unsupported: [] };
    }
    const max = (q.options || []).length;
    let choice = (Array.isArray(a.choice) ? a.choice : a.choice != null ? [a.choice] : [])
      .map(Number)
      .filter((i) => Number.isInteger(i) && i >= 1 && i <= max);
    choice = Array.from(new Set(choice));
    if (q.type !== 'multiple') choice = choice.slice(0, 1);
    return { n: q.n, choice, needsUser: needs || !choice.length, unsupported: [] };
  });

  // Проверка открытых ответов на выдуманные факты
  const open = answers.filter((a) => a.text);
  if (A.verify && open.length) {
    try {
      const checkRaw = await chat(settings, [
        {
          role: 'system',
          content:
            'Ты проверяешь ответы соискателя на выдуманные утверждения. Источники правды: резюме, факты и правила соискателя. Для каждого ответа найди опору для утверждений о соискателе (опыт, навыки, компании, цифры, сроки). Верни только JSON {"unsupported": [{"n": 1, "phrase": "точная фраза из ответа без опоры"}]}. Если опора есть везде, верни пустой массив.'
        },
        {
          role: 'user',
          content:
            'РЕЗЮМЕ:\n' + (settings.resume.slice(0, 5000) || '(нет)') +
            '\n\nФАКТЫ:\n' + formatFacts(settings.facts) +
            '\n\nПРАВИЛА СОИСКАТЕЛЯ:\n' + formatAnswerRules(A.rules) +
            '\n\nОТВЕТЫ:\n' + open.map((a) => a.n + '. ' + a.text).join('\n\n')
        }
      ]);
      const c = parseJson(checkRaw);
      for (const u of Array.isArray(c.unsupported) ? c.unsupported : []) {
        const n = Number(u && typeof u === 'object' ? u.n : NaN);
        const phrase = String(u && typeof u === 'object' ? u.phrase || '' : u || '').trim();
        const target = answers.find((a) => a.n === n) || (open.length === 1 ? open[0] : null);
        if (target && phrase) target.unsupported.push(phrase);
      }
    } catch (e) {
      for (const a of open) a.unsupported.push('Проверку на выдуманные факты выполнить не удалось, перечитайте ответ внимательно.');
    }
  }
  return { answers };
}

// ---------- сопроводительное письмо ----------

async function writeLetter(settings, vacancy) {
  const hasFacts = settings.facts.some((f) => f.title || f.situation || f.actions || f.result);
  if (!hasFacts && !settings.resume.trim()) {
    throw new Error('Добавьте резюме или хотя бы один факт в настройках: письмо пишется только по ним.');
  }
  const L = settings.letter;
  const text = vacancyText(vacancy);

  const system = [
    'Ты пишешь сопроводительное письмо от лица соискателя. Отвечай только JSON вида {"letter": "текст письма"}.',
    'Жёсткие правила:',
    '- Используй только то, что есть в блоках «Резюме» и «Факты». Не придумывай навыки, компании, проекты, цифры и сроки.',
    '- Выбери два самых подходящих к вакансии факта и расскажи о них коротко. Не перечисляй всё подряд.',
    '- Первая фраза опирается на конкретную задачу, продукт или формулировку из вакансии, а не на общие слова.',
    '- Объём: от ' + L.minWords + ' до ' + L.maxWords + ' слов. Тон: ' + L.tone + '.',
    L.banned ? '- Не используй выражения: ' + L.banned + '.' : '',
    '- Не обращайся по имени, если имя рекрутера не указано в вакансии.',
    L.signature ? '- Закончи подписью: ' + L.signature : '- Подпись не добавляй.',
    '- Пиши по-русски, без списков и без заголовков.'
  ]
    .filter(Boolean)
    .join('\n');

  const user = [
    'РЕЗЮМЕ:',
    settings.resume.trim() ? settings.resume.slice(0, 5000) : '(не заполнено)',
    '',
    'ФАКТЫ:',
    formatFacts(settings.facts),
    '',
    'ВАКАНСИЯ:',
    text,
    '',
    'Ответ дай строго на русском языке. Дословные цитаты из вакансии оставляй как в оригинале.'
  ].join('\n');

  const raw = await chat(settings, [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]);
  let letter;
  try {
    letter = String(parseJson(raw).letter || '').trim();
  } catch (e) {
    letter = raw.trim(); // модель могла вернуть просто текст
  }
  if (!letter) throw new Error('Модель не вернула текст письма.');

  if (!mostlyRussian(letter)) {
    try {
      const raw2 = await chat(settings, [
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: raw },
        { role: 'user', content: 'Письмо написано не на русском. Перепиши его на русском языке, сохранив все правила. Верни JSON {"letter": "..."}.' }
      ]);
      let l2;
      try {
        l2 = String(parseJson(raw2).letter || '').trim();
      } catch (e) {
        l2 = raw2.trim();
      }
      if (l2 && mostlyRussian(l2)) letter = l2;
    } catch (e) {}
  }

  let unsupported = [];
  if (L.verify) {
    try {
      const checkRaw = await chat(settings, [
        {
          role: 'system',
          content:
            'Ты проверяешь письмо на выдуманные утверждения. Для каждого утверждения о соискателе (опыт, навыки, компании, проекты, цифры, сроки) найди опору в резюме или фактах. Верни только JSON {"unsupported": ["точная фраза из письма без опоры"]}. Если опора есть везде, верни пустой массив.'
        },
        {
          role: 'user',
          content: 'РЕЗЮМЕ:\n' + (settings.resume.slice(0, 5000) || '(нет)') + '\n\nФАКТЫ:\n' + formatFacts(settings.facts) + '\n\nПИСЬМО:\n' + letter
        }
      ]);
      const c = parseJson(checkRaw);
      unsupported = (Array.isArray(c.unsupported) ? c.unsupported : []).map(String).filter(Boolean);
    } catch (e) {
      unsupported = ['Проверку на выдуманные факты выполнить не удалось, перечитайте письмо внимательно.'];
    }
  }
  return { letter, unsupported };
}
