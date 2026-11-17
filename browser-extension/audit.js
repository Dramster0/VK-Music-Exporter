(() => {
  function audit(rows, options) {
    const raw = String(options.expectedText ?? '').trim();
    const expected = /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
    const countMatches = expected !== null && expected === rows.length;
    const issues = [];
    if (expected === null) issues.push('Введите точное количество из ВК, если оно показано для этого списка.');
    else if (!countMatches) issues.push(`В ВК указано ${expected}, собрано ${rows.length}.`);
    if (!options.startConfirmed) issues.push('Начало списка не подтверждено пользователем.');
    if (!options.endConfirmed) issues.push('Конец списка не подтверждён пользователем.');
    if (options.gap) issues.push('Обнаружен разрыв сбора.');
    if (options.parseFailure) issues.push('Не все строки удалось распознать.');
    if (options.ambiguous) issues.push('Повторяющиеся последовательности или отсутствующие ID требуют ручной сверки.');
    return {
      expected_count: expected, expected_count_source: expected === null ? null : 'user_entered_from_vk',
      collected_count: rows.length, count_matches: countMatches,
      start_confirmed_by_user: !!options.startConfirmed, end_confirmed_by_user: !!options.endConfirmed,
      continuity: options.gap ? 'gap_detected' : options.parseFailure || options.ambiguous ? 'uncertain' : 'observed_overlaps',
      checks_passed: issues.length === 0, issues,
      // DOM checks and user attestations are evidence, not a source snapshot.
      status: options.gap || options.parseFailure ? 'partial' : 'unverified'
    };
  }
  globalThis.VkExportAudit = {audit};
  if (typeof module !== 'undefined') module.exports = {audit};
})();
