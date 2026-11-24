const $ = (s, r = document) => r.querySelector(s);

let settings = mergeSettings({});
let saveTimer = null;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function h(tag, props, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined) e.append(c);
  return e;
}

// ---------- сохранение ----------

function flash(msg) {
  const el = $('#saved');
  el.textContent = msg;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => (el.textContent = ''), 2000);
}

async function saveNow() {
  await chrome.storage.local.set({ settings });
  flash('Сохранено');
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

// ---------- простые поля ----------

function bindSimple(id, get, set, type) {
  const el = $('#' + id);
  if (type === 'checkbox') el.checked = !!get();
  else el.value = get();
  el.addEventListener('input', () => {
    set(type === 'checkbox' ? el.checked : type === 'number' ? Number(el.value) || 0 : el.value);
    scheduleSave();
  });
}

function bindAll() {
  const p = settings.provider;
  bindSimple('baseUrl', () => p.baseUrl, (v) => (p.baseUrl = v.trim()));
  bindSimple('apiKey', () => p.apiKey, (v) => (p.apiKey = v.trim()));
  bindSimple('model', () => p.model, (v) => (p.model = v.trim()));
  bindSimple('resume', () => settings.resume, (v) => (settings.resume = v));
  const L = settings.letter;
  bindSimple('tone', () => L.tone, (v) => (L.tone = v));
  bindSimple('minWords', () => L.minWords, (v) => (L.minWords = v), 'number');
  bindSimple('maxWords', () => L.maxWords, (v) => (L.maxWords = v), 'number');
  bindSimple('banned', () => L.banned, (v) => (L.banned = v));
  bindSimple('signature', () => L.signature, (v) => (L.signature = v));
  bindSimple('verify', () => L.verify, (v) => (L.verify = v), 'checkbox');
  document.querySelectorAll('input[name="evalMode"]').forEach((el) => {
    el.checked = el.value === settings.evalMode;
    el.addEventListener('change', () => {
      if (!el.checked) return;
      settings.evalMode = el.value;
      scheduleSave();
    });
  });
  bindSimple('showModelInfo', () => settings.showModelInfo, (v) => (settings.showModelInfo = v), 'checkbox');
  bindSimple('ansEnabled', () => settings.answers.enabled, (v) => (settings.answers.enabled = v), 'checkbox');
  bindSimple('ansAuto', () => settings.answers.auto, (v) => (settings.answers.auto = v), 'checkbox');
  bindSimple('ansVerify', () => settings.answers.verify, (v) => (settings.answers.verify = v), 'checkbox');
  bindSimple('toneOn', () => settings.tone.enabled, (v) => (settings.tone.enabled = v), 'checkbox');
  bindSimple('roastOn', () => settings.tone.roast, (v) => (settings.tone.roast = v), 'checkbox');
  // «Прожарка» идёт в запросе Духотометра: без него она недоступна
  const syncRoast = () => {
    $('#roastOn').disabled = !settings.tone.enabled;
  };
  $('#toneOn').addEventListener('input', syncRoast);
  syncRoast();
  bindSimple('hlLines', () => settings.highlight.lines, (v) => (settings.highlight.lines = v), 'checkbox');
  bindSimple('hlAuto', () => settings.highlight.auto, (v) => (settings.highlight.auto = v), 'checkbox');
}

// ---------- критерии ----------

let dragIndex = null;
let sortDir = null; // null (ручной порядок) | 'desc' | 'asc'

// Критичность: стоп-фактор выше всего, затем минусы по весу, затем плюсы по весу.
function critScore(r) {
  if (r.kind === 'stop') return 100;
  const w = r.weight || 'mid';
  const table = r.kind === 'plus' ? { high: 30, mid: 20, low: 10 } : { high: 90, mid: 70, low: 50 };
  return table[w] || table.mid;
}

function updateSortButton() {
  const b = $('#sort-rules');
  if (!b) return;
  if (sortDir === 'desc') b.textContent = 'По критичности ↓ (критичные сверху)';
  else if (sortDir === 'asc') b.textContent = 'По критичности ↑ (мягкие сверху)';
  else b.textContent = 'Сортировать по критичности';
}

function sortRules() {
  sortDir = sortDir === 'desc' ? 'asc' : 'desc';
  const k = sortDir === 'desc' ? -1 : 1;
  // sort в браузере стабильный: равные по критичности критерии сохраняют прежний порядок
  settings.rules.sort((a, b) => k * (critScore(a) - critScore(b)));
  updateSortButton();
  renderRules();
  scheduleSave();
}

function clearDropMarks() {
  document.querySelectorAll('.rule.drop-before, .rule.drop-after').forEach((r) => r.classList.remove('drop-before', 'drop-after'));
}

// Переносит критерий с позиции from так, чтобы он оказался перед элементом to (to может быть равен длине списка).
function moveRule(from, to) {
  if (from === to || from + 1 === to) return from;
  const [item] = settings.rules.splice(from, 1);
  if (from < to) to--;
  settings.rules.splice(to, 0, item);
  sortDir = null;
  updateSortButton();
  renderRules();
  scheduleSave();
  return to;
}

function renderRules() {
  const box = $('#rules');
  box.replaceChildren();
  settings.rules.forEach((r, i) => {
    const kind = h(
      'select',
      { 'aria-label': 'Тип критерия' },
      h('option', { value: 'minus' }, 'Минус'),
      h('option', { value: 'plus' }, 'Плюс'),
      h('option', { value: 'stop' }, 'Стоп-фактор')
    );
    kind.value = r.kind || 'minus';

    const weight = h(
      'select',
      { 'aria-label': 'Вес критерия' },
      h('option', { value: 'low' }, 'Слабый'),
      h('option', { value: 'mid' }, 'Средний'),
      h('option', { value: 'high' }, 'Сильный')
    );
    weight.value = r.weight || 'mid';
    weight.style.visibility = r.kind === 'stop' ? 'hidden' : 'visible'; // место сохраняется, поле не «схлопывает» сетку

    const text = h('textarea', {
      class: 'desc',
      rows: '3',
      'aria-label': 'Описание критерия',
      placeholder: 'Например: работа в условиях большой неопределённости.\nМожно описать подробнее и в несколько строк: что именно считать минусом и почему.',
      value: r.text || ''
    });
    const kw = h('input', {
      type: 'text',
      'aria-label': 'Ключевые слова',
      class: 'wide',
      placeholder: 'Ключевые слова через запятую (необязательно): стрессоустойчивость, неопределённость',
      value: r.keywords || ''
    });

    const up = h('button', { type: 'button', class: 'move up', 'aria-label': 'Поднять критерий выше', title: 'Выше' }, '↑');
    const down = h('button', { type: 'button', class: 'move down', 'aria-label': 'Опустить критерий ниже', title: 'Ниже' }, '↓');
    up.disabled = i === 0;
    down.disabled = i === settings.rules.length - 1;
    up.addEventListener('click', () => {
      const n = moveRule(i, i - 1);
      const row = $('#rules').children[n];
      if (row) (row.querySelector('.up:not([disabled])') || row.querySelector('.down')).focus();
    });
    down.addEventListener('click', () => {
      const n = moveRule(i, i + 2);
      const row = $('#rules').children[n];
      if (row) (row.querySelector('.down:not([disabled])') || row.querySelector('.up')).focus();
    });
    const del = h('button', { type: 'button', class: 'danger', onclick: () => {
      settings.rules.splice(i, 1);
      renderRules();
      scheduleSave();
    } }, 'Удалить');

    const grip = h('span', { class: 'grip', 'aria-hidden': 'true', title: 'Потяните, чтобы изменить порядок' }, '⋮⋮');
    const row = h(
      'div',
      { class: 'rule ' + (r.kind || 'minus') },
      grip, kind, weight, text, h('div', { class: 'wide' }, kw), h('div', { class: 'foot' }, up, down, del)
    );

    // Строка становится перетаскиваемой только за «ручку», чтобы не мешать выделению текста в полях
    grip.addEventListener('mousedown', () => (row.draggable = true));
    grip.addEventListener('mouseup', () => (row.draggable = false));
    row.addEventListener('dragstart', (e) => {
      dragIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragIndex = null;
      row.draggable = false;
      row.classList.remove('dragging');
      clearDropMarks();
    });

    kind.addEventListener('change', () => {
      r.kind = kind.value;
      row.className = 'rule ' + r.kind;
      weight.style.visibility = r.kind === 'stop' ? 'hidden' : 'visible';
      sortDir = null;
      updateSortButton();
      scheduleSave();
    });
    weight.addEventListener('change', () => { r.weight = weight.value; sortDir = null; updateSortButton(); scheduleSave(); });
    text.addEventListener('input', () => { r.text = text.value; autoGrow(text); scheduleSave(); });
    kw.addEventListener('input', () => { r.keywords = kw.value; scheduleSave(); });
    box.append(row);
    autoGrow(text);
  });
}

// Поле описания растёт вместе с текстом, но не меньше трёх строк
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}

// Один набор обработчиков на весь список: строки пересоздаются при каждой перерисовке.
function bindRuleDnD() {
  const box = $('#rules');
  const dropAfter = (e, row) => e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;

  box.addEventListener('dragover', (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropMarks();
    const row = e.target.closest('.rule');
    if (row) row.classList.add(dropAfter(e, row) ? 'drop-after' : 'drop-before');
  });
  box.addEventListener('dragleave', (e) => {
    if (!box.contains(e.relatedTarget)) clearDropMarks();
  });
  box.addEventListener('drop', (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    const row = e.target.closest('.rule');
    clearDropMarks();
    if (!row) return;
    let to = [...box.children].indexOf(row);
    if (dropAfter(e, row)) to++;
    moveRule(dragIndex, to);
  });
}

// ---------- критерии ответов на вопросы работодателя ----------

let dragAnsIndex = null;
const ANS_TEXT_PH = {
  rule: 'Как отвечать. Например: отвечай от первого лица, 3-5 предложений, с одним конкретным примером и результатом.',
  ban: 'Чего не делать. Например: не называй конкретную сумму ожидаемой зарплаты.',
  canned: 'Заготовка ответа на типовой вопрос.'
};
const ANS_TOPIC_PH = {
  rule: 'Тема вопросов (необязательно)',
  ban: 'Тема вопросов (необязательно)',
  canned: 'Тема вопроса, например: ожидания по зарплате'
};

function moveAnsRule(from, to) {
  if (from === to || from + 1 === to) return from;
  const list = settings.answers.rules;
  const [item] = list.splice(from, 1);
  if (from < to) to--;
  list.splice(to, 0, item);
  renderAnsRules();
  scheduleSave();
  return to;
}

function renderAnsRules() {
  const box = $('#ans-rules');
  const list = settings.answers.rules;
  box.replaceChildren();
  list.forEach((r, i) => {
    const kind = h(
      'select',
      { 'aria-label': 'Тип критерия ответа' },
      h('option', { value: 'rule' }, 'Правило'),
      h('option', { value: 'ban' }, 'Запрет'),
      h('option', { value: 'canned' }, 'Готовый ответ')
    );
    kind.value = r.kind || 'rule';
    const topic = h('input', { type: 'text', 'aria-label': 'Тема вопросов', placeholder: ANS_TOPIC_PH[kind.value], value: r.topic || '' });
    const text = h('textarea', {
      class: 'desc', rows: '3', 'aria-label': 'Текст критерия ответа', placeholder: ANS_TEXT_PH[kind.value], value: r.text || ''
    });

    const up = h('button', { type: 'button', class: 'move up', 'aria-label': 'Поднять критерий выше', title: 'Выше' }, '↑');
    const down = h('button', { type: 'button', class: 'move down', 'aria-label': 'Опустить критерий ниже', title: 'Ниже' }, '↓');
    up.disabled = i === 0;
    down.disabled = i === list.length - 1;
    up.addEventListener('click', () => {
      const n = moveAnsRule(i, i - 1);
      const row = $('#ans-rules').children[n];
      if (row) (row.querySelector('.up:not([disabled])') || row.querySelector('.down')).focus();
    });
    down.addEventListener('click', () => {
      const n = moveAnsRule(i, i + 2);
      const row = $('#ans-rules').children[n];
      if (row) (row.querySelector('.down:not([disabled])') || row.querySelector('.up')).focus();
    });
    const del = h('button', { type: 'button', class: 'danger', onclick: () => {
      list.splice(i, 1);
      renderAnsRules();
      scheduleSave();
    } }, 'Удалить');

    const grip = h('span', { class: 'grip', 'aria-hidden': 'true', title: 'Потяните, чтобы изменить порядок' }, '⋮⋮');
    const row = h('div', { class: 'rule ans ' + (r.kind || 'rule') }, grip, kind, topic, text, h('div', { class: 'foot' }, up, down, del));

    grip.addEventListener('mousedown', () => (row.draggable = true));
    grip.addEventListener('mouseup', () => (row.draggable = false));
    row.addEventListener('dragstart', (e) => {
      dragAnsIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragAnsIndex = null;
      row.draggable = false;
      row.classList.remove('dragging');
      clearDropMarks();
    });

    kind.addEventListener('change', () => {
      r.kind = kind.value;
      row.className = 'rule ans ' + r.kind;
      topic.placeholder = ANS_TOPIC_PH[r.kind];
      text.placeholder = ANS_TEXT_PH[r.kind];
      scheduleSave();
    });
    topic.addEventListener('input', () => { r.topic = topic.value; scheduleSave(); });
    text.addEventListener('input', () => { r.text = text.value; autoGrow(text); scheduleSave(); });
    box.append(row);
    autoGrow(text);
  });
}

function bindAnsDnD() {
  const box = $('#ans-rules');
  const dropAfter = (e, row) => e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
  box.addEventListener('dragover', (e) => {
    if (dragAnsIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropMarks();
    const row = e.target.closest('.rule');
    if (row) row.classList.add(dropAfter(e, row) ? 'drop-after' : 'drop-before');
  });
  box.addEventListener('dragleave', (e) => {
    if (!box.contains(e.relatedTarget)) clearDropMarks();
  });
  box.addEventListener('drop', (e) => {
    if (dragAnsIndex === null) return;
    e.preventDefault();
    const row = e.target.closest('.rule');
    clearDropMarks();
    if (!row) return;
    let to = [...box.children].indexOf(row);
    if (dropAfter(e, row)) to++;
    moveAnsRule(dragAnsIndex, to);
  });
}

// ---------- факты ----------

function field(label, el) {
  return h('label', {}, label, el);
}

function renderFacts() {
  const box = $('#facts');
  box.replaceChildren();
  settings.facts.forEach((f, i) => {
    const mk = (key, tag, ph, rows) => {
      const el = h(tag, { placeholder: ph, value: f[key] || '' });
      if (rows) el.rows = rows;
      if (tag === 'input') el.type = 'text';
      el.addEventListener('input', () => { f[key] = el.value; scheduleSave(); });
      return el;
    };
    const del = h('button', { type: 'button', class: 'danger', onclick: () => {
      settings.facts.splice(i, 1);
      renderFacts();
      scheduleSave();
    } }, 'Удалить');

    box.append(
      h(
        'div',
        { class: 'fact' },
        field('Место и роль', mk('title', 'input', 'Например: Компания Х, руководитель проектов')),
        field('Ситуация или задача', mk('situation', 'textarea', 'Что было нужно сделать и почему', 3)),
        field('Что вы сделали', mk('actions', 'textarea', 'Ваши конкретные действия', 3)),
        field('Результат', mk('result', 'textarea', 'Что изменилось, по возможности с цифрами', 2)),
        field('Теги', mk('tags', 'input', 'Через запятую: кризис, рост команды, внедрение процесса')),
        h('div', { class: 'foot' }, del)
      )
    );
  });
}

// ---------- провайдер ----------

function bindProvider() {
  $('#preset').addEventListener('change', (e) => {
    if (!e.target.value) return;
    settings.provider.baseUrl = e.target.value;
    $('#baseUrl').value = e.target.value;
    scheduleSave();
  });

  $('#check').addEventListener('click', async () => {
    const out = $('#check-result');
    out.textContent = 'Проверяю…';
    try {
      const u = new URL(settings.provider.baseUrl);
      const granted = await chrome.permissions.request({ origins: [u.protocol + '//' + u.hostname + '/*'] });
      if (!granted) {
        out.textContent = 'Доступ к этому адресу не разрешён.';
        return;
      }
      await saveNow();
      const r = await chrome.runtime.sendMessage({ type: 'ping' });
      out.textContent = r && r.ok ? 'Работает. Ответ модели: ' + r.data : 'Ошибка: ' + ((r && r.error) || 'нет ответа');
    } catch (e) {
      out.textContent = 'Ошибка: ' + e.message;
    }
  });
}

// ---------- экспорт и импорт ----------

function bindTransfer() {
  $('#export').addEventListener('click', () => {
    const copy = JSON.parse(JSON.stringify(settings));
    copy.provider.apiKey = '';
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'hh-assistant-settings.json' });
    document.body.append(a);
    a.click();
    a.remove();
  });

  $('#import').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const key = settings.provider.apiKey;
      settings = mergeSettings(imported);
      settings.provider.apiKey = key;
      fillAll();
      await saveNow();
    } catch (err) {
      flash('Не удалось прочитать файл настроек.');
    }
    e.target.value = '';
  });
}

// ---------- общий запуск ----------

function fillAll() {
  bindAll();
  renderRules();
  renderAnsRules();
  renderFacts();
}

async function init() {
  settings = await loadSettings();
  fillAll();
  bindProvider();
  bindTransfer();

  bindRuleDnD();
  bindAnsDnD();
  $('#add-ans-rule').addEventListener('click', () => {
    settings.answers.rules.push({ id: uid(), kind: 'rule', topic: '', text: '' });
    renderAnsRules();
    scheduleSave();
  });
  $('#sort-rules').addEventListener('click', sortRules);
  $('#add-rule').addEventListener('click', () => {
    settings.rules.push({ id: uid(), kind: 'minus', weight: 'mid', text: '', keywords: '' });
    renderRules();
    scheduleSave();
  });
  $('#add-fact').addEventListener('click', () => {
    settings.facts.push({ id: uid(), title: '', situation: '', actions: '', result: '', tags: '' });
    renderFacts();
    scheduleSave();
  });
}

init();
