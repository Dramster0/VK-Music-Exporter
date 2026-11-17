(() => {
  function filename(title, extension) {
    let name = String(title || '').normalize('NFC')
      .replace(/[<>:"/\\|?*\u0000-\u001F\u007F]/g, '_')
      .trim().replace(/[. ]+$/g, '');
    name = Array.from(name).slice(0, 120).join('').replace(/[. ]+$/g, '');
    if (!name || /^\.+$/.test(name)) name = 'Музыка ВК';
    if (/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i.test(name)) name = '_' + name;
    return name + '.' + extension;
  }
  globalThis.VkExportFilename = {filename};
  if (typeof module !== 'undefined') module.exports = {filename};
})();
