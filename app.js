// Halaman publik: beranda menu, katalog, testimonials, about, keranjang, checkout WhatsApp.
(function () {
  const T = window.TOKO;
  const CART_KEY = 'toko-hazze-cart';
  const SECTIONS = ['katalog', 'testimonials', 'about'];
  const COLORS = ['var(--pink)', 'var(--butter)', 'var(--baby)', 'var(--mint)'];
  let products = [], settings = null;
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); // hanya keranjang yang disimpan di browser

  const $ = (id) => document.getElementById(id);
  const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const canBuy = (p) => p.available && (p.stock ?? 0) > 0;
  const cartCount = () => cart.reduce((n, c) => n + c.qty, 0);

  function renderSettings() {
    if (!settings) return;
    const name = settings.store_name || 'Toko Hazze';
    $('storeName').textContent = name;
    $('brandName').textContent = name;
    $('welcome').textContent = settings.welcome_text || '';
    $('footer').textContent = settings.footer_text || '';
    if (settings.profile_image_url) $('avatar').src = settings.profile_image_url;
    document.title = name;

    // Deskripsi toko ditampilkan sebagai kartu berwarna, satu kartu per paragraf.
    const paras = (settings.store_description || '')
      .split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean);
    $('aboutText').innerHTML = paras.length
      ? paras.map((t, i) => `<div class="note" style="background:${COLORS[i % COLORS.length]}"><p>${T.esc(t)}</p></div>`).join('')
      : '<div class="empty">Deskripsi toko belum diisi.</div>';
  }

  const CATEGORIES = ['Streaming', 'Editing', 'Education', 'Lainnya'];

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

  // Katalog dikelompokkan per kategori: Streaming, Editing, Education, lalu sisanya.
  function renderCatalog() {
    if (!products.length) { $('catalog').innerHTML = '<div class="empty">Katalog belum tersedia.</div>'; return; }
    const groups = CATEGORIES
      .map((cat) => ({ cat, items: products.filter((p) => (p.category || 'Lainnya') === cat) }))
      .filter((g) => g.items.length);
    $('catalog').innerHTML = groups.map((g) => `
      <section class="cat-group">
        <h3 class="group-title">${T.esc(g.cat)}</h3>
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
  $('contactBtn').addEventListener('click', () => {
    const num = String(settings?.whatsapp_number || '').replace(/\D/g, '');
    window.open(`https://wa.me/${num}`, '_blank', 'noopener');
  });

  // Setiap kali menu dibuka, data dimuat ulang dari Supabase agar perubahan dari admin langsung terlihat.
  window.addEventListener('hashchange', () => load());

  async function load() {
    if (!T.ready) {
      $('catalog').innerHTML = '<div class="notice">Isi config.js dulu.</div>';
      renderCart(); return;
    }
    const [p, s, t] = await Promise.all([
      db.from('products').select('*').order('sort_order').order('created_at'),
      db.from('settings').select('*').eq('id', 1).single(),
      db.from('testimonials').select('*').eq('published', true).order('sort_order'),
    ]);
    if (p.error) console.error(p.error);
    products = p.data || [];
    settings = s.data || null;
    renderSettings(); renderCatalog();
    renderGallery($('testimonialGallery'), t.data || []);
    renderCart();
    showSection(location.hash.slice(1));
  }

  // Sebelum data dimuat, sembunyikan semua halaman kecuali beranda.
  SECTIONS.forEach((s) => { $(s).hidden = true; });
  $('cartPanel').hidden = true;
  load();
})();
