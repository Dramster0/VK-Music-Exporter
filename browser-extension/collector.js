(() => {
  const existing = document.getElementById('vk-metadata-exporter');
  if (existing) { existing.hidden = !existing.hidden; return; }
  const host = document.createElement('div');
  host.id = 'vk-metadata-exporter';
  const shadow = host.attachShadow({mode: 'open'});
  // Keep native input editing, but do not let VK's bubbling keyboard shortcuts
  // interpret spaces/arrows typed inside the extension as player commands.
  for (const type of ['keydown', 'keypress', 'keyup']) {
    shadow.addEventListener(type, event => {
      if (event.composedPath().some(node => node instanceof HTMLElement &&
        (node.matches('input, textarea') || node.isContentEditable))) {
        event.stopPropagation();
      }
    });
  }
  shadow.innerHTML = VkExportPanel.html;
  const diagnostic = shadow.getElementById('diagnostic');
  const checkPanel = shadow.getElementById('check-panel');
  const csvButton = shadow.getElementById('csv');
  let diagnosticMode = false;
  function downloadJson(data, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function describe(element) {
    return {tag: element.tagName.toLowerCase(), classes: Array.from(element.classList).slice(0, 20),
      attribute_names: element.getAttributeNames().filter(name => /^(data-|aria-|role$)/.test(name)),
      child_count: element.children.length};
  }
  function captureStructure(target) {
    const ancestors = [];
    let node = target;
    for (let level = 0; level < 7 && node && !['BODY','HTML'].includes(node.tagName); level++, node = node.parentElement) {
      ancestors.push({element: describe(node), descendants: Array.from(node.querySelectorAll('*')).slice(0, 100).map(describe)});
    }
    return {diagnostic_version: 1, contains: 'Element tags, CSS classes and attribute names only. No text, URLs or attribute values.', ancestors};
  }
  diagnostic.onclick = () => {
    diagnosticMode = true; selecting = true;
    document.addEventListener('click', pick, true);
    status.textContent = 'Нажмите на название проблемного трека: скачается vk-layout-diagnostic.json без текста и значений атрибутов.';
  };
  document.documentElement.append(host);
  const status = shadow.getElementById('status');
  const save = shadow.getElementById('save');
  const {selector, read, listContainer} = VkExportAdapter;
  let container = null, rows = [], observer = null, timer = null, selecting = false, stopped = false;
  let parseFailure = false, ambiguous = false, sampleCount = 0;
  function getAudit() {
    return VkExportAudit.audit(rows, {
      expectedText: shadow.getElementById('expected').value,
      startConfirmed: shadow.getElementById('start-check').checked,
      endConfirmed: shadow.getElementById('end-check').checked,
      gap: stopped, parseFailure, ambiguous
    });
  }
  function renderAudit() {
    const report = getAudit();
    shadow.getElementById('audit-status').textContent = report.checks_passed
      ? 'Количество совпало, начало и конец подтверждены вами, разрывов не замечено. Автоматически полнота не доказана.'
      : report.issues.join(' ');
    return report;
  }
  shadow.getElementById('check').onclick = () => { if (container && !stopped) sample(); renderAudit(); };
  checkPanel.addEventListener('change', renderAudit);
  const warnings = new Set(['Экспериментальный сбор DOM: полнота и порядок не подтверждены.', 'Начало списка и его конец автоматически не проверены.']);
  function sample() {
    if (stopped || !container) return;
    if (!container.isConnected) { stopForGap('Страница заменила список. Скачайте результат и начните новый сбор.'); return; }
    const candidates = Array.from(container.querySelectorAll(selector));
    const batch = candidates.map(read).filter(Boolean);
    if (batch.length !== candidates.length) {
      parseFailure = true;
      warnings.add('Некоторые строки не распознаны и пропущены.');
    }
    if (!batch.length) { status.textContent = 'Строки найдены, но названия или исполнители не распознаны. Сохраните диагностику трека.'; return; }
    const result = VkExportMerge.merge(rows, batch);
    sampleCount++;
    if (result.gap) { stopForGap('Потеряно перекрытие строк. Сбор остановлен, чтобы не перепутать порядок.'); return; }
    if (result.ambiguous) {
      ambiguous = true;
      warnings.add('Повторяющиеся последовательности или отсутствующие ID требуют сверки.');
    }
    if (result.rows.length !== rows.length) shadow.getElementById('end-check').checked = false;
    rows = result.rows;
    shadow.getElementById('count').textContent = rows.length.toLocaleString('ru-RU');
    shadow.getElementById('notice').textContent = parseFailure
      ? 'Некоторые строки не удалось прочитать. Результат может быть неполным.'
      : ambiguous ? 'Есть неоднозначные повторы. Проверьте список перед переносом.' : '';
    save.disabled = rows.length === 0;
    csvButton.disabled = rows.length === 0;
    status.textContent = rows.length === 1
      ? 'Собрана 1 песня. Если в плейлисте их больше, сохраните диагностику трека: контейнер списка может быть не распознан.'
      : `Собрано: ${rows.length}. Прокручивайте медленно. Полнота не подтверждена.`;
    renderAudit();
  }
  function stopForGap(message) { stopped = true; observer?.disconnect(); warnings.add(message); shadow.getElementById('notice').textContent = 'Сбор остановлен. Скачайте частичный результат или начните заново.'; status.textContent = message + ` Сохранено строк: ${rows.length}.`; }
  function pick(event) {
    if (!selecting || event.composedPath().includes(host)) return;
    if (diagnosticMode) {
      event.preventDefault(); event.stopImmediatePropagation();
      diagnosticMode = false; selecting = false;
      document.removeEventListener('click', pick, true);
      downloadJson(captureStructure(event.target), 'vk-layout-diagnostic.json');
      status.textContent = 'Диагностика сохранена. Пришлите vk-layout-diagnostic.json в чат для исправления распознавания.';
      return;
    }
    const row = event.target.closest?.(selector);
    if (!row) { status.textContent = 'Строка не распознана. Нажмите диагностику и выберите название трека.'; return; }
    event.preventDefault(); event.stopImmediatePropagation();
    selecting = false; document.removeEventListener('click', pick, true);
    container = listContainer(row);
    observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(sample, 150); });
    observer.observe(container, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-full-id', 'data-audio-id']});
    shadow.getElementById('select').disabled = true;
    shadow.getElementById('select').textContent = 'Список выбран';
    sample();
  }
  shadow.getElementById('select').onclick = () => {
    diagnosticMode = false; selecting = true; status.textContent = 'Теперь нажмите название любой песни в нужном списке ВК.';
    document.addEventListener('click', pick, true);
  };
  csvButton.onclick = () => {
    if (!stopped) sample();
    renderAudit();
    if (!rows.length) return;
    const url = URL.createObjectURL(new Blob([VkExportCsv.serialize(rows)], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = VkExportFilename.filename(shadow.getElementById('collection-name').value, 'csv'); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status.textContent = 'CSV передан браузеру. Проверьте загрузки. Для другого списка нажмите «Очистить сбор и выбрать другой список» под кнопкой «Скачать CSV».';
  };
  save.onclick = () => {
    if (!stopped) sample();
    const verification = {...renderAudit(), sample_count: sampleCount, collector_version: '0.5.4'};
    const data = {schema_version: 1, title: shadow.getElementById('collection-name').value.trim() || 'Музыка ВК', source: 'vk-browser-dom-experimental',
      status: verification.status, expected_count: verification.expected_count, verification, warnings: Array.from(warnings),
      tracks: rows.map((row, i) => ({position: i+1, ...row}))};
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = VkExportFilename.filename(data.title, 'json'); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  shadow.getElementById('close').onclick = () => { host.hidden = true; selecting = false; document.removeEventListener('click', pick, true); };
  shadow.getElementById('reset').onclick = () => {
    observer?.disconnect(); clearTimeout(timer); document.removeEventListener('click', pick, true);
    rows = []; container = null; stopped = false; selecting = false; diagnosticMode = false;
    parseFailure = false; ambiguous = false; sampleCount = 0;
    warnings.clear(); warnings.add('Полнота и порядок автоматически не подтверждены.');
    shadow.getElementById('count').textContent = '0';
    shadow.getElementById('notice').textContent = '';
    shadow.getElementById('collection-name').value = '';
    shadow.getElementById('expected').value = '';
    shadow.getElementById('start-check').checked = false;
    shadow.getElementById('end-check').checked = false;
    const select = shadow.getElementById('select'); select.disabled = false; select.textContent = 'Выбрать список на странице';
    csvButton.disabled = true; save.disabled = true;
    status.textContent = 'Откройте начало нового списка и выберите любой трек в нём.';
    renderAudit();
  };
})();
