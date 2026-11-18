// Halaman publik: beranda (hero, menu, little notes), katalog dengan pencarian & filter, testimonials, about, keranjang, checkout WhatsApp.
(function () {
  const T = window.TOKO;
  const CART_KEY = 'toko-hazze-cart';
  const SECTIONS = ['katalog', 'testimonials', 'about'];
  const COLORS = ['var(--pink)', 'var(--butter)', 'var(--baby)', 'var(--mint)'];
  const NOTE_COLORS = ['var(--pink)', 'var(--baby)', 'var(--mint)', 'var(--butter)'];
  const FALLBACK_CATEGORY = 'Lainnya';
  let categories = []; // nama kategori dari tabel categories, sesuai urutan yang diatur admin
  let catIcons = {};   // nama kategori -> ikon (emoji) dari admin
  const DEFAULT_ICONS = { Streaming: 'tv', Editing: 'pencil', Education: 'book', Lainnya: 'play' };
  const DEFAULT_TAGLINE = 'Your Digital Happy Place';
  const DEFAULT_WELCOME = 'Your little corner for digital favorites, lovely finds, and everyday essentials.';
  const DEFAULT_HIGHLIGHTS = ['Harga bersahabat', 'Proses mudah', 'Pelayanan ramah'];
  // Format: baris pertama = judul, baris berikutnya = isi. Tiap card dipisah baris kosong.
  const DEFAULT_NOTES = `Welcome to Toko Hazze!
your little shopping corner ♡ Kami senang menyambutmu di sini! Setiap pesanan akan dilayani dengan penuh perhatian dan diproses sesuai urutan antrean.
♡ open hours : 09.00 — until i'm tired 💤
hope you have a lovely shopping experience!

Estimasi Proses
Mohon perhatikan bahwa estimasi pemrosesan pesanan berkisar 5–60 menit setelah pembayaran dan informasi pesanan dikonfirmasi. Waktu dapat menyesuaikan antrean dan kondisi layanan, so please wait patiently! ♡

Garansi
Setiap produk memiliki ketentuan garansi masing-masing dengan masa berlaku maksimal 3 × 24 jam. Jangan lupa untuk membaca detail dan ketentuan produk terlebih dahulu sebelum checkout, ya!

A Gentle Reminder
Don't forget to save your login proof! Pastikan screenshot bukti login tersimpan dengan baik setelah pesanan selesai diproses. Bukti ini akan diperlukan jika sewaktu-waktu kamu ingin mengajukan klaim garansi. Tanpa screenshot, klaim tidak dapat kami proses.
Kindly refrain from requesting rush orders, as each order is processed according to its respective queue. We truly appreciate your patience and understanding while waiting for your order to be completed. Thank you for choosing Toko Hazze ♡.`;

  let products = [], settings = null;
  let filter = { cat: 'Semua', q: '' };
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); // hanya keranjang yang disimpan di browser

  const $ = (id) => document.getElementById(id);
  const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const canBuy = (p) => p.available && (p.stock ?? 0) > 0;
  const cartCount = () => cart.reduce((n, c) => n + c.qty, 0);
  const lines = (text) => (text || '').split('\n').map((s) => s.trim()).filter(Boolean);

  // Pecah teks menjadi blok: dipisah baris kosong, baris pertama judul, sisanya isi.
  function parseBlocks(text) {
    return (text || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
      const ls = b.split('\n').map((s) => s.trim());
      return ls.length > 1 ? { title: ls[0], body: ls.slice(1).join('\n') } : { title: ls[0], body: '' };
    });
  }

  function renderSettings() {
    const s = settings || {};
    const name = s.store_name || 'Toko Hazze';
    $('storeName').textContent = name;
    $('brandName').textContent = name;
    $('welcome').textContent = s.welcome_text || DEFAULT_WELCOME;
    $('footer').textContent = s.footer_text || '';
    const hl = lines(s.highlights);
    $('highlights').innerHTML = (hl.length ? hl : DEFAULT_HIGHLIGHTS).map((h) => `<span>${T.esc(h)}</span>`).join('');
    // Nama, tagline, dan foto di ID Card (pembuka dan beranda)
    document.querySelectorAll('[data-id-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-id-tagline]').forEach((el) => { el.textContent = s.tagline || DEFAULT_TAGLINE; });
    document.querySelectorAll('[data-id-avatar]').forEach((img) => { if (s.profile_image_url) img.src = s.profile_image_url; });
    document.title = name;

    // Little Notes di beranda
    const notes = parseBlocks(s.notes_text || DEFAULT_NOTES);
    $('notesList').innerHTML = notes.map((n, i) => `
      <div class="note" style="--c:${NOTE_COLORS[i % NOTE_COLORS.length]}">
        ${n.title ? `<h4 class="note-title">${T.esc(n.title)}</h4>` : ''}
        ${n.body ? `<p>${T.esc(n.body)}</p>` : ''}
      </div>`).join('');

    // Deskripsi toko ditampilkan sebagai kartu berwarna, satu kartu per paragraf.
    const paras = lines((s.store_description || '').replace(/\n\s*\n/g, '\n'));
    $('aboutText').innerHTML = paras.length
      ? paras.map((t, i) => `<div class="note" style="background:${COLORS[i % COLORS.length]}"><p>${T.esc(t)}</p></div>`).join('')
      : '<div class="empty">Deskripsi toko belum diisi.</div>';
  }

  function productCard(p, i) {
    return `
      <article class="card${p.available ? '' : ' unavailable'}">
        <div class="card-top" style="background-color:${COLORS[i % COLORS.length]}">
          <img src="${T.esc(p.image_url || '')}" alt="${T.esc(p.name)}" data-zoom>
          <span class="label">${T.esc(p.account_type)}</span>
        </div>
        <div class="card-body">
          <span class="cat">Akun ${T.esc(p.account_type)} · ${canBuy(p) ? 'Stok ' + (p.stock ?? 0) : 'Stok habis'}</span>
          <h3>${T.esc(p.name)}</h3>
          ${p.description ? `<p class="desc">${T.esc(p.description)}</p>` : ''}
          <div class="card-foot">
            <div>
              <small>Mulai dari</small>
              <div class="price">${T.rupiah(p.price)}</div>
            </div>
            <button class="add" data-add="${p.id}" ${canBuy(p) ? '' : 'disabled'} aria-label="Tambah ke keranjang">${canBuy(p) ? '+' : '×'}</button>
          </div>
        </div>
      </article>`;
  }

  const iconHtml = (name) => window.TOKO_ICONS.svg(catIcons[name] || DEFAULT_ICONS[name]);

  // Semua kategori: dari admin, lalu kategori produk yang tidak terdaftar (agar tidak hilang).
  function allCategories() {
    const extra = [...new Set(products.map((p) => p.category || FALLBACK_CATEGORY))]
      .filter((c) => !categories.includes(c));
    return [...categories, ...extra];
  }

  // Katalog: pencarian nama, filter kategori (pill), lalu dikelompokkan per kategori.
  function renderCatalog() {
    const catOf = (p) => p.category || 'Lainnya';
    const available = products.filter((p) => p.available).length;
    $('catCount').textContent = `${available} aplikasi tersedia`;

    const cats = ['Semua', ...allCategories().filter((c) => products.some((p) => catOf(p) === c))];
    $('filters').innerHTML = cats.map((c) =>
      `<button class="pill${c === filter.cat ? ' active' : ''}" data-cat="${T.esc(c)}">${c === 'Semua' ? window.TOKO_ICONS.svg('star') : iconHtml(c)} ${T.esc(c)}</button>`).join('');

    if (!products.length) {
      $('catalog').innerHTML = '<div class="empty">Katalog belum tersedia.</div>';
      $('catEmpty').hidden = true; return;
    }
    const q = filter.q.trim().toLowerCase();
    const list = products.filter((p) =>
      (filter.cat === 'Semua' || catOf(p) === filter.cat) &&
      (!q || p.name.toLowerCase().includes(q)));
    const groups = allCategories()
      .map((cat) => ({ cat, items: list.filter((p) => catOf(p) === cat) }))
      .filter((g) => g.items.length);
    $('catEmpty').hidden = groups.length > 0;
    $('catalog').innerHTML = groups.map((g) => `
      <section class="cat-group">
        <h3 class="group-title">${iconHtml(g.cat)} ${T.esc(g.cat)}</h3>
        <div class="grid">${g.items.map(productCard).join('')}</div>
      </section>`).join('');
  }

  function renderGallery(el, rows) {
    el.innerHTML = rows.length ? rows.map((r, i) => `
      <figure class="shot" data-zoom>
        <img src="${T.esc(r.image_url)}" alt="Testimoni ${i + 1}" loading="lazy">
        <span class="num">${String(r.number || i + 1).padStart(2, '0')}</span>
      </figure>`).join('') : '<div class="empty">Belum ada gambar.</div>';
  }

  function renderCart() {
    $('cartCount').textContent = cartCount();
    $('cartEmpty').hidden = cart.length > 0;
    $('checkoutBtn').disabled = cart.length === 0;
    $('cartItems').innerHTML = cart.map((c) => `
      <div class="cart-row">
        <img src="${T.esc(c.image_url || '')}" alt="">
        <div>
          <strong>${T.esc(c.name)}</strong><br>
          <span class="badge">Akun ${T.esc(c.account_type)}</span><br>
          ${T.rupiah(c.price)} × ${c.qty} = <b>${T.rupiah(c.price * c.qty)}</b>
        </div>
        <div class="qty">
          <button data-dec="${c.id}">−</button>${c.qty}<button data-inc="${c.id}">+</button>
          <button class="del" data-del="${c.id}" title="Hapus">✕</button>
        </div>
      </div>`).join('');
    $('cartTotal').textContent = 'Total: ' + T.rupiah(cart.reduce((n, c) => n + c.price * c.qty, 0));
  }

  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p || !canBuy(p)) return T.toast('Stok habis');
    const found = cart.find((c) => c.id === id);
    if (found) {
      if (found.qty >= p.stock) return T.toast('Stok tidak cukup');
      found.qty += 1;
    } else {
      cart.push({ id: p.id, name: p.name, account_type: p.account_type, price: p.price, image_url: p.image_url, qty: 1 });
    }
    saveCart(); renderCart();
    T.toast('Berhasil ditambahkan ke keranjang');
  }

  // Format bawaan. Admin bisa mengganti lewat kolom wa_template dan wa_item_template.
  const DEFAULT_TEMPLATE = '{intro}\n\n🛍️ *Detail Pesanan*\n\n{items}\n━━━━━━━━━━━━━━\n💰 *Total: {total}*\n\nMohon informasi lebih lanjut ya. Terima kasih! 🙏';
  const DEFAULT_ITEM = '*{no}. {name}*\n     Akun: {type}\n     {qty} × {price} = {subtotal}';
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  function buildWhatsAppMessage() {
    const itemTpl = settings?.wa_item_template || DEFAULT_ITEM;
    const items = cart.map((c, i) => fill(itemTpl, {
      no: i + 1, name: c.name, type: c.account_type, qty: c.qty,
      price: T.rupiah(c.price), subtotal: T.rupiah(c.price * c.qty),
    })).join('\n\n');
    const total = cart.reduce((n, c) => n + c.price * c.qty, 0);
    return fill(settings?.wa_template || DEFAULT_TEMPLATE, {
      intro: settings?.wa_intro || 'Halo, Toko Hazze! Saya ingin melakukan pemesanan.',
      items, total: T.rupiah(total),
    }).trim();
  }

  function whatsappUrl(message) {
    const num = String(settings?.whatsapp_number || '').replace(/\D/g, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  }

  // Tanpa hash = beranda (header, hero, menu). Dengan hash = satu halaman saja.
  function showSection(id) {
    const target = SECTIONS.includes(id) ? id : null;
    SECTIONS.forEach((s) => { $(s).hidden = s !== target; });
    $('home').hidden = !!target;
    $('cartPanel').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goHome() {
    if (location.hash) location.hash = '';
    else showSection(null);
  }

  function showCart() {
    SECTIONS.forEach((s) => { $(s).hidden = true; });
    $('home').hidden = true;
    $('cartPanel').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event delegation
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-zoom]');
    if (!t) return;
    if (t.dataset.home !== undefined) return goHome();
    if (t.dataset.cat !== undefined) { filter.cat = t.dataset.cat; return renderCatalog(); }
    if (t.dataset.add) return addToCart(t.dataset.add);
    if (t.dataset.inc) {
      const c = cart.find((x) => x.id === t.dataset.inc);
      const p = products.find((x) => x.id === t.dataset.inc);
      if (c && p && c.qty < p.stock) c.qty++;
      else if (c) T.toast('Stok tidak cukup');
      saveCart(); return renderCart();
    }
    if (t.dataset.dec) { const c = cart.find((x) => x.id === t.dataset.dec); if (c) c.qty = Math.max(1, c.qty - 1); saveCart(); return renderCart(); }
    if (t.dataset.del) { cart = cart.filter((x) => x.id !== t.dataset.del); saveCart(); return renderCart(); }
    if (t.dataset.zoom !== undefined) {
      const img = t.tagName === 'IMG' ? t : t.querySelector('img');
      $('lightboxImg').src = img.src; $('lightbox').classList.add('open');
    }
  });
  $('lightbox').addEventListener('click', () => $('lightbox').classList.remove('open'));

  $('search').addEventListener('input', (e) => { filter.q = e.target.value; renderCatalog(); });

  $('cartBtn').addEventListener('click', showCart);
  $('backToCatalog').addEventListener('click', () => {
    if (location.hash === '#katalog') showSection('katalog');
    else location.hash = '#katalog';
  });
  $('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) return T.toast('Keranjang masih kosong');
    if (!settings?.whatsapp_number) return T.toast('Nomor WhatsApp belum diatur');
    window.open(whatsappUrl(buildWhatsAppMessage()), '_blank', 'noopener');
    // Pesan hanya disiapkan; customer sendiri yang menekan kirim di WhatsApp.
  });
  $('contactMenu').addEventListener('click', () => $('contactBtn').click());
  $('contactBtn').addEventListener('click', () => {
    const num = String(settings?.whatsapp_number || '').replace(/\D/g, '');
    window.open(`https://wa.me/${num}`, '_blank', 'noopener');
  });

  // Setiap kali menu dibuka, data dimuat ulang dari Supabase agar perubahan dari admin langsung terlihat.
  // Pindah halaman langsung saat menu diketuk (tidak menunggu data), lalu data dimuat ulang.
  window.addEventListener('hashchange', () => {
    showSection(location.hash.slice(1));
    load();
  });

  async function load() {
    if (!T.ready) {
      $('catalog').innerHTML = '<div class="notice">Isi config.js dulu.</div>';
      renderCart(); showSection(location.hash.slice(1)); return;
    }
    const [p, s, t, c] = await Promise.all([
      db.from('products').select('*').order('sort_order').order('created_at'),
      db.from('settings').select('*').eq('id', 1).single(),
      db.from('testimonials').select('*').eq('published', true).order('sort_order'),
      db.from('categories').select('*').order('sort_order'),
    ]);
    if (p.error) console.error(p.error);
    products = p.data || [];
    categories = (c.data || []).map((x) => x.name);
    catIcons = Object.fromEntries((c.data || []).map((x) => [x.name, x.icon || '']));
    settings = s.data || null;
    try {
      renderSettings(); renderCatalog();
      renderGallery($('testimonialGallery'), t.data || []);
      renderCart();
    } catch (err) { console.error(err); }
    showSection(location.hash.slice(1));
  }

  // ===== Pembuka: amplop surat -> ID Card -> beranda =====
  // Pembuka tampil setiap website dibuka. Tombol Skip atau selesai animasi menutupnya.
  let opening = false;
  function finishIntro() {
    $('intro').classList.add('gone');
  }
  function openEnvelope() {
    if (opening) return;
    opening = true;
    $('envelope').classList.add('open');
    setTimeout(() => $('stage').classList.add('show-card'), 1100);
    setTimeout(finishIntro, 3300);
  }
  $('tapOpen').addEventListener('click', openEnvelope);
  $('envelope').addEventListener('click', openEnvelope);
  $('envelope').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
  $('skipIntro').addEventListener('click', finishIntro);

  // Sebelum data dimuat, sembunyikan semua halaman kecuali beranda.
  SECTIONS.forEach((s) => { $(s).hidden = true; });
  $('cartPanel').hidden = true;
  $('notesList').innerHTML = '';
  renderSettings();
  load();
})();
