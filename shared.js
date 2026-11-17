// Helper bersama untuk halaman publik dan admin.
(function () {
  const cfg = window.TOKO_CONFIG;
  const ready = !cfg.SUPABASE_URL.includes('GANTI');
  window.db = ready ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  window.TOKO = {
    ready,
    rupiah(n) {
      return 'Rp' + Number(n).toLocaleString('id-ID');
    },
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    toast(msg) {
      let el = document.getElementById('toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show'), 2200);
    },
    async uploadImage(file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from('assets').upload(path, file, { cacheControl: '3600' });
      if (error) throw error;
      return db.storage.from('assets').getPublicUrl(path).data.publicUrl;
    },
  };
})();
