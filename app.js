// Halaman publik: katalog, keranjang, testimonials, order proof, checkout WhatsApp.
(function () {
  const T = window.TOKO;
  const CART_KEY = 'toko-hazze-cart';
  let products = [], settings = null;
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); // hanya keranjang yang disimpan di browser

  const $ = (id) => document.getElementById(id);
  const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

  function renderSettings() {
    if (!settings) return;
    $('storeName').textContent = settings.store_name || 'TOKO HAZZE';
    $('welcome').textContent = settings.welcome_text || '';
    $('footer').textContent = settings.footer_text || '';
    if (settings.profile_image_url) $('avatar').src = settings.profile_image_url;
    document.title = settings.store_name || 'TOKO HAZZE';
  }

  function renderCatalog() {
    const list = products;
    $('catalog').innerHTML = list.length ? list.map((p) => `
      <article class="card ${p.available ? '' : 'unavailable'}">
        <span class="label">${T.esc(p.account_type)}</span>
        <img src="${T.esc(p.image_url || '')}" alt="${T.esc(p.name)}" data-zoom>
        <h3>${T.esc(p.name)}</h3>
        <span class="badge ${T.esc(p.account_type)}">Akun ${T.esc(p.account_type)}</span>
        ${p.description ? `<p style="margin:4px 0;font-size:15px">${T.esc(p.description)}</p>` : ''}
        <div class="price">${T.rupiah(p.price)}</div>
        <button class="btn" data-add="${p.id}" ${p.available ? '' : 'disabled'}>
          ${p.available ? 'Tambah ke Keranjang' : 'Tidak tersedia'}
        </button>
      </article>`).join('') : '<div class="empty">Katalog belum tersedia.</div>';
  }

  function renderGallery(el, rows) {
    el.innerHTML = rows.length ? rows.map((r, i) => `
      <figure class="shot" data-zoom>
        <img src="${T.esc(r.image_url)}" alt="Gambar ${i + 1}" loading="lazy">
        <span class="num">${String(r.number || i + 1).padStart(2, '0')}</span>
      </figure>`).join('') : '<div class="empty">Belum ada gambar.</div>';
  }

  // Hanya satu bagian (Katalog / Testimonials / Order Proof) yang tampil sekaligus.
  const SECTIONS = ['katalog', 'testimonials', 'order-proof'];
  // Tanpa hash = halaman depan (hanya header dan menu). Dengan hash = satu halaman saja.
  function showSection(id) {
    const target = SECTIONS.includes(id) ? id : null;
    SECTIONS.forEach((s) => { $(s).hidden = s !== target; });
    $('contact').hidden = !!target;
    document.querySelectorAll('.nav a').forEach((a) => {
      a.classList.toggle('active', !!target && a.getAttribute('href') === '#' + target);
    });
    $('cartPanel').hidden = true;
    window.scrollTo({ top: target ? document.querySelector('.nav').offsetTop - 10 : 0, behavior: 'smooth' });
  }
  window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));

  function cartCount() { return cart.reduce((n, c) => n + c.qty, 0); }

  function renderCart() {
    $('cartCount').textContent = cartCount();
    $('cartEmpty').hidden = cart.length > 0;
    $('checkoutBtn').disabled = cart.length === 0;
    $('cartItems').innerHTML = cart.map((c) => `
      <div class="cart-row">
        <img src="${T.esc(c.image_url || '')}" alt="">
        <div>
          <strong>${T.esc(c.name)}</strong><br>
          <span class="badge ${T.esc(c.account_type)}">Akun ${T.esc(c.account_type)}</span><br>
          ${T.rupiah(c.price)} &times; ${c.qty} = <b>${T.rupiah(c.price * c.qty)}</b>
        </div>
        <div class="qty">
          <button data-dec="${c.id}">−</button>${c.qty}<button data-inc="${c.id}">+</button>
          <button data-del="${c.id}" title="Hapus" style="background:#ffb3b3;margin-left:6px">✕</button>
        </div>
      </div>`).join('');
    const total = cart.reduce((n, c) => n + c.price * c.qty, 0);
    $('cartTotal').textContent = 'Total: ' + T.rupiah(total);
  }

  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p || !p.available) return;
    const found = cart.find((c) => c.id === id);
    if (found) found.qty += 1;
    else cart.push({ id: p.id, name: p.name, account_type: p.account_type, price: p.price, image_url: p.image_url, qty: 1 });
    saveCart(); renderCart();
    T.toast('Berhasil ditambahkan ke keranjang');
  }

  function buildWhatsAppMessage() {
    const lines = [settings?.wa_intro || 'Halo, Toko Hazze! Saya ingin melakukan pemesanan.', '', 'Berikut rincian pesanan saya:', ''];
    cart.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}`);
      lines.push(`   Jenis akun: ${c.account_type}`);
      lines.push(`   Harga: ${T.rupiah(c.price)}`);
      lines.push(`   Jumlah: ${c.qty}`);
      lines.push(`   Subtotal: ${T.rupiah(c.price * c.qty)}`);
      lines.push('');
    });
    const total = cart.reduce((n, c) => n + c.price * c.qty, 0);
    lines.push(`Total pesanan: ${T.rupiah(total)}`);
    lines.push('');
    lines.push('Mohon informasi lebih lanjut mengenai pesanan saya. Terima kasih!');
    return lines.join('\n');
  }

  function whatsappUrl(message) {
    const num = String(settings?.whatsapp_number || '').replace(/\D/g, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  }

  // Event delegation
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-zoom]');
    if (!t) return;
    if (t.dataset.home !== undefined) return (location.hash = '');
    if (t.dataset.add) return addToCart(t.dataset.add);
    if (t.dataset.inc) { const c = cart.find((x) => x.id === t.dataset.inc); if (c) c.qty++; saveCart(); return renderCart(); }
    if (t.dataset.dec) { const c = cart.find((x) => x.id === t.dataset.dec); if (c) c.qty = Math.max(1, c.qty - 1); saveCart(); return renderCart(); }
    if (t.dataset.del) { cart = cart.filter((x) => x.id !== t.dataset.del); saveCart(); return renderCart(); }
    if (t.dataset.zoom !== undefined) {
      const img = t.tagName === 'IMG' ? t : t.querySelector('img');
      $('lightboxImg').src = img.src; $('lightbox').classList.add('open');
    }
  });
  $('lightbox').addEventListener('click', () => $('lightbox').classList.remove('open'));

  $('cartBtn').addEventListener('click', () => {
    $('cartPanel').hidden = false; $('cartPanel').scrollIntoView({ behavior: 'smooth' });
  });
  $('backToCatalog').addEventListener('click', () => {
    location.hash = '#katalog';
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

  async function load() {
    if (!T.ready) {
      $('catalog').innerHTML = '<div class="notice">Isi config.js dengan URL dan anon key Supabase dulu.</div>';
      renderCart(); return;
    }
    const [p, s, t, o] = await Promise.all([
      db.from('products').select('*').order('sort_order').order('created_at'),
      db.from('settings').select('*').eq('id', 1).single(),
      db.from('testimonials').select('*').eq('published', true).order('sort_order'),
      db.from('order_proofs').select('*').eq('published', true).order('sort_order'),
    ]);
    if (p.error) console.error(p.error);
    products = p.data || [];
    settings = s.data || null;
    renderSettings(); renderCatalog();
    renderGallery($('testimonialGallery'), t.data || []);
    renderGallery($('proofGallery'), o.data || []);
    renderCart();
    showSection(location.hash.slice(1));
  }

  // Sebelum data dimuat, sembunyikan semua halaman kecuali header dan menu.
  SECTIONS.forEach((s) => { $(s).hidden = true; });
  load();
})();
