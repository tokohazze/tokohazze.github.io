// Set ikon garis (SVG) untuk kategori katalog. Dipakai di halaman publik dan admin.
(function () {
  const ICONS = {
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    play: '<path d="M5 4l15 8-15 8z" transform="rotate(-30 12 12)"/>',
    tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="8 2 12 7 16 2"/>',
    film: '<rect x="2" y="3" width="20" height="18" rx="2"/><line x1="7" y1="3" x2="7" y2="21"/><line x1="17" y1="3" x2="17" y2="21"/><line x1="2" y1="9" x2="7" y2="9"/><line x1="2" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="22" y2="9"/><line x1="17" y1="15" x2="22" y2="15"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    palette: '<path d="M12 2a10 10 0 0 0 0 20c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a5 5 0 0 0 5-5c0-4.8-4.5-8.1-10-8.1z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    ai: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="15" y1="18" x2="15" y2="22"/><line x1="2" y1="9" x2="6" y2="9"/><line x1="2" y1="15" x2="6" y2="15"/><line x1="18" y1="9" x2="22" y2="9"/><line x1="18" y1="15" x2="22" y2="15"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><polyline points="3 8 12 13 21 8"/><line x1="12" y1="13" x2="12" y2="21"/>',
  };

  const LIST = [
    { key: 'tv', label: 'TV / Streaming' },
    { key: 'pencil', label: 'Pensil / Editing' },
    { key: 'play', label: 'Play / Lainnya' },
    { key: 'film', label: 'Film / Video' },
    { key: 'scissors', label: 'Gunting / Editing' },
    { key: 'cap', label: 'Topi Wisuda / Education' },
    { key: 'book', label: 'Buku' },
    { key: 'music', label: 'Musik' },
    { key: 'palette', label: 'Palet / Desain' },
    { key: 'camera', label: 'Kamera / Foto' },
    { key: 'ai', label: 'AI / Chip' },
    { key: 'briefcase', label: 'Produktivitas' },
    { key: 'cloud', label: 'Cloud' },
    { key: 'shield', label: 'Keamanan / Utilitas' },
    { key: 'star', label: 'Bintang' },
    { key: 'box', label: 'Kotak / Lainnya' },
  ];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Kunci ikon -> SVG. Nilai lama yang bukan kunci (misalnya emoji) ditampilkan apa adanya.
  function svg(key) {
    if (ICONS[key]) return `<svg class="cat-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>`;
    if (key) return `<span class="cat-emoji">${esc(key)}</span>`;
    return svg('box');
  }

  window.TOKO_ICONS = { list: LIST, svg };
})();
