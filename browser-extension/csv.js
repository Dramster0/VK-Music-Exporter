(() => {
  const fields = ['position', 'artist', 'title', 'album', 'duration_seconds', 'source_track_id', 'source_url', 'availability'];
  function cell(value, textual) {
    let text = value == null ? '' : String(value);
    if (textual && (/^[\s\p{Cf}]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function serialize(rows) {
    const lines = [fields.map(field => cell(field, false)).join(',')];
    rows.forEach((row, index) => lines.push(fields.map(field =>
      cell(field === 'position' ? index + 1 : row[field], !['position', 'duration_seconds'].includes(field))
    ).join(',')));
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }
  globalThis.VkExportCsv = {serialize};
  if (typeof module !== 'undefined') module.exports = {serialize};
})();
