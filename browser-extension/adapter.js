(() => {
  const selector = '.audio_row[data-full-id], [data-audio-id]';
  function read(node) {
    const modern = node.hasAttribute('data-audio-id');
    // These classes were observed in the user's layout diagnostic (2026-11-17).
    // Scope text queries to the metadata region, excluding player controls.
    const metadata = modern ? node.querySelector('.vkit-zm1fLg') : node;
    if (!metadata) return null;
    const titleNode = metadata.querySelector(modern ? '.vkit-bC5yeH' : '.audio_row__title_inner, .audio_row__title');
    const artistNode = metadata.querySelector(modern ? '.vkit-6B6OHT' : '.audio_row__performers');
    const title = titleNode?.textContent.trim() || '';
    const artist = artistNode?.textContent.trim() || '';
    if (!title || !artist) return null;
    let times;
    if (modern) {
      // The live export showed a single elapsed playback time masquerading as
      // duration. Until a dedicated duration element is verified, leave blank.
      times = [];
    } else times = [node.querySelector('.audio_row__duration')?.textContent.trim() || ''];
    const match = times.length === 1 ? /^(\d+):(\d{2})$/.exec(times[0]) : null;
    return {artist, title, album: '', duration_seconds: match && Number(match[2]) < 60 ? Number(match[1])*60+Number(match[2]) : null,
      source_track_id: node.getAttribute(modern ? 'data-audio-id' : 'data-full-id') || '', source_url: '', availability: 'unknown'};
  }
  function listContainer(row) {
    // Playlist cells can have several per-track wrappers, with or without
    // sortable attributes. Find the nearest ancestor containing sibling rows.
    const initial = row.parentElement;
    let node = initial;
    for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
      if (['BODY', 'HTML', 'MAIN'].includes(node.tagName)) break;
      const count = node.querySelectorAll(selector).length;
      if (count > 1) return node;
      // Do not escape an explicitly bounded list/modal to capture other music.
      if (['list', 'listbox', 'dialog'].includes(node.getAttribute('role')) || node.tagName === 'SECTION') return node;
    }
    return initial;
  }
  globalThis.VkExportAdapter = {selector, read, listContainer};
  if (typeof module !== 'undefined') module.exports = {selector, read, listContainer};
})();
