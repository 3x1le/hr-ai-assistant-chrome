// Общий код для страницы настроек и фонового скрипта.
// Никаких личных данных здесь нет: всё вводится пользователем в настройках.

const DEFAULT_LETTER = {
  tone: 'деловой, спокойный, без пафоса',
  minWords: 120,
  maxWords: 180,
  banned: 'стрессоустойчив, коммуникабелен, быстро обучаюсь, ответственный',
  verify: true,
  signature: ''
};

function mergeSettings(s) {
  s = s || {};
  return {
    provider: Object.assign({ baseUrl: '', apiKey: '', model: '' }, s.provider || {}),
    resume: typeof s.resume === 'string' ? s.resume : '',
    evalMode: s.evalMode === 'strict' ? 'strict' : 'free',
    showModelInfo: s.showModelInfo !== false,
    rules: Array.isArray(s.rules) ? s.rules : [],
    facts: Array.isArray(s.facts) ? s.facts : [],
    letter: Object.assign({}, DEFAULT_LETTER, s.letter || {}),
    highlight: Object.assign({ auto: true, lines: false }, s.highlight || {}),
    tone: Object.assign({ enabled: true, roast: false }, s.tone || {}),
    answers: Object.assign({ enabled: true, auto: true, verify: true }, s.answers || {}, {
      rules: Array.isArray((s.answers || {}).rules) ? s.answers.rules : []
    })
  };
}

async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  return mergeSettings(stored.settings);
}

// Какой моделью сейчас оценивается вакансия: подпись для панели и тип провайдера.
function providerInfo(p) {
  p = p || {};
  const model = String(p.model || '').trim();
  let host = '';
  try {
    host = new URL(p.baseUrl).hostname.toLowerCase();
  } catch (e) {}
  if (!host || !model) return { kind: 'none', host, model, label: 'не выбрана (откройте настройки)', title: '', sub: '' };
  const local =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1' || host === '0.0.0.0' ||
    host.endsWith('.local') || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (local) return { kind: 'local', host, model, label: 'Локальная модель', title: model, sub: model };
  const named = (name, kind) => ({ kind, host, model, label: name + ' (' + model + ')', title: host, sub: '' });
  if (host.endsWith('openrouter.ai')) return named('Open router', 'openrouter');
  if (host.endsWith('generativelanguage.googleapis.com')) return named('Google AI Studio', 'google');
  if (host.endsWith('groq.com')) return named('Groq', 'groq');
  if (host.endsWith('openai.com')) return named('OpenAI', 'openai');
  return named(host, 'other');
}
