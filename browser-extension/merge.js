(() => {
  // Sequences represent occurrences, never a set of track IDs.
  function key(row) { return row.source_track_id ? 'id:' + row.source_track_id : JSON.stringify([row.artist, row.title]); }
  function merge(previous, batch) {
    if (!batch.length) return {rows: previous.slice(), ambiguous: false};
    if (!previous.length) return {rows: batch.slice(), ambiguous: false};
    const a = previous.map(key), b = batch.map(key);
    const uncertain = new Set(a).size !== a.length || new Set(b).size !== b.length || batch.some(row => !row.source_track_id);
    // Re-observing the same unique window is normal, not an ambiguity.
    for (let start = 0; start <= a.length - b.length; start++) {
      if (b.every((v, i) => a[start + i] === v)) {
        const rows = previous.slice();
        batch.forEach((row, i) => { rows[start + i] = row; });
        return {rows, ambiguous: uncertain};
      }
    }
    for (let overlap = Math.min(a.length, b.length); overlap > 0; overlap--) {
      if (b.slice(0, overlap).every((v, i) => a[a.length - overlap + i] === v)) {
        const rows = previous.slice();
        batch.slice(0, overlap).forEach((row, i) => { rows[rows.length - overlap + i] = row; });
        return {rows: rows.concat(batch.slice(overlap)), ambiguous: uncertain};
      }
    }
    // Do not guess whether a non-overlapping window follows or precedes the list.
    return {rows: previous.slice(), ambiguous: true, gap: true};
  }
  globalThis.VkExportMerge = {merge};
  if (typeof module !== 'undefined') module.exports = {merge};
})();
