// Halaman admin: login Supabase Auth, lalu kelola katalog, galeri, dan pengaturan.
(function () {
  const T = window.TOKO;
  const $ = (id) => document.getElementById(id);
  let state = { products: [], testimonials: [], order_proofs: [], settings: null };

  function show(view) {
    $('loginView').hidden = view !== 'login';
    $('appView').hidden = view !== 'app';
  }

  async function checkSession() {
    if (!T.ready) { $('loginView').insertAdjacentHTML('afterbegin', '<p class="notice">Isi config.js dulu.</p>'); return show('login'); }
    const { data } = await db.auth.getSession();
    if (!data.session) return show('login');
    // Pastikan akun ini terdaftar sebagai admin (lihat schema.sql).
    const { data: isAdmin, error } = await db.rpc('is_admin');
    if (error || !isAdmin) {
      await db.auth.signOut();
      $('loginMsg').hidden = false; $('loginMsg').textContent = 'Akun ini belum terdaftar sebagai admin.';
      return show('login');
    }
    $('whoami').textContent = 'Login sebagai ' + data.session.user.email;
    show('app');
    loadAll();
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) { $('loginMsg').hidden = false; $('loginMsg').textContent = 'Email atau password salah.'; return; }
    checkSession();
  });
  $('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); show('login'); });

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.tab').forEach((t) => t.hidden = t.id !== 'tab-' + b.dataset.tab);
  }));

  async function loadAll() {
    const [p, t, s] = await Promise.all([
      db.from('products').select('*').order('sort_order').order('created_at'),
      db.from('testimonials').select('*').order('sort_order'),
      db.from('settings').select('*').eq('id', 1).single(),
    ]);
    state = { products: p.data || [], testimonials: t.data || [], settings: s.data };
    renderStats(); renderProducts(); renderGallery('testimonials'); renderSettings();
  }

  function renderStats() {
    $('statProducts').textContent = state.products.length;
    $('statTesti').textContent = state.testimonials.length;
  }

  // ===== Katalog =====
  function renderProducts() {
    $('productRows').innerHTML = state.products.map((p) => `
      <tr>
        <td><img src="${T.esc(p.image_url || '')}" alt=""></td>
        <td>${T.esc(p.name)}</td>
        <td>${T.esc(p.account_type)} · ${T.esc(p.category || 'Lainnya')}</td>
        <td>${T.rupiah(p.price)}</td>
        <td>${p.available ? 'Tersedia' : 'Tidak'} · Stok ${p.stock ?? 0}</td>
        <td class="row-actions">
          <button data-edit="${p.id}">Edit</button>
          <button data-up="${p.id}">▲</button>
          <button data-down="${p.id}">▼</button>
          <button class="danger" data-delp="${p.id}">Hapus</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6">Belum ada aplikasi.</td></tr>';
  }

  function resetProductForm() {
    $('productForm').reset(); $('productId').value = ''; $('pAvail').checked = true;
  }
  $('pCancel').addEventListener('click', resetProductForm);

  $('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('productId').value;
    const file = $('pFile').files[0];
    let image_url = id ? state.products.find((p) => p.id === id)?.image_url : null;
    try {
      if (file) image_url = await T.uploadImage(file);
      const row = {
        name: $('pName').value.trim(),
        account_type: $('pType').value,
        category: $('pCategory').value,
        price: Number($('pPrice').value),
        description: $('pDesc').value.trim() || null,
        stock: Math.max(0, Number($('pStock').value) || 0),
        available: $('pAvail').checked,
        image_url,
      };
      const res = id
        ? await db.from('products').update(row).eq('id', id)
        : await db.from('products').insert(row);
      if (res.error) throw res.error;
      T.toast('Aplikasi disimpan'); resetProductForm(); loadAll();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
  });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) {
      const p = state.products.find((x) => x.id === b.dataset.edit);
      $('productId').value = p.id; $('pName').value = p.name; $('pType').value = p.account_type;
      $('pCategory').value = p.category || 'Lainnya';
      $('pPrice').value = p.price; $('pDesc').value = p.description || ''; $('pStock').value = p.stock ?? 0;
      $('pAvail').checked = p.available; window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.delp && confirm('Hapus aplikasi ini?')) {
      await db.from('products').delete().eq('id', b.dataset.delp); loadAll();
    }
    if (b.dataset.up || b.dataset.down) {
      await swapOrder('products', b.dataset.up || b.dataset.down, b.dataset.up ? -1 : 1, state.products);
    }
    if (b.dataset.tdel && confirm('Hapus gambar ini?')) {
      await db.from(b.dataset.table).delete().eq('id', b.dataset.tdel); loadAll();
    }
    if (b.dataset.toggle) {
      const row = state[b.dataset.table].find((x) => x.id === b.dataset.toggle);
      await db.from(b.dataset.table).update({ published: !row.published }).eq('id', row.id); loadAll();
    }
    if (b.dataset.num) {
      const v = prompt('Nomor urut baru:', b.dataset.cur || '');
      if (v !== null) { await db.from(b.dataset.table).update({ number: Number(v) || 0 }).eq('id', b.dataset.num); loadAll(); }
    }
    if (b.dataset.tup || b.dataset.tdown) {
      const table = b.dataset.table;
      await swapOrder(table, b.dataset.tup || b.dataset.tdown, b.dataset.tup ? -1 : 1, state[table]);
    }
  });

  // Tukar sort_order dengan item di sebelahnya.
  async function swapOrder(table, id, dir, list) {
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    await db.from(table).update({ sort_order: b.sort_order }).eq('id', a.id);
    await db.from(table).update({ sort_order: a.sort_order }).eq('id', b.id);
    loadAll();
  }

  // ===== Galeri testimoni & order proof =====
  function renderGallery(table) {
    const rowsEl = $('testiRows');
    rowsEl.innerHTML = state[table].map((r) => `
      <tr>
        <td><img src="${T.esc(r.image_url)}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:10px"></td>
        <td>${String(r.number).padStart(2, '0')}</td>
        <td>${r.published ? 'Publik' : 'Draft'}</td>
        <td>${r.sort_order}</td>
        <td class="row-actions">
          <button data-num="${r.id}" data-table="${table}" data-cur="${r.number}">No.</button>
          <button data-toggle="${r.id}" data-table="${table}">${r.published ? 'Draft' : 'Publikasikan'}</button>
          <button data-tup="${r.id}" data-table="${table}">▲</button>
          <button data-tdown="${r.id}" data-table="${table}">▼</button>
          <button class="danger" data-tdel="${r.id}" data-table="${table}">Hapus</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5">Belum ada gambar.</td></tr>';
  }

  document.querySelectorAll('form[data-gallery]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const table = form.dataset.gallery;
    const file = form.querySelector('input[type=file]').files[0];
    if (!file) return;
    try {
      const url = await T.uploadImage(file);
      const list = state[table];
      const next = list.length ? Math.max(...list.map((x) => x.number)) + 1 : 1;
      const sort = list.length ? Math.max(...list.map((x) => x.sort_order)) + 1 : 0;
      const { error } = await db.from(table).insert({ image_url: url, number: next, sort_order: sort, published: true });
      if (error) throw error;
      form.reset(); T.toast('Gambar diunggah'); loadAll();
    } catch (err) { alert('Gagal mengunggah: ' + err.message); }
  }));

  // ===== Pengaturan =====
  function renderSettings() {
    const s = state.settings || {};
    $('sName').value = s.store_name || ''; $('sWelcome').value = s.welcome_text || '';
    $('sDesc').value = s.store_description || ''; $('sFooter').value = s.footer_text || '';
    $('cNumber').value = s.whatsapp_number || ''; $('cIntro').value = s.wa_intro || '';
    $('cTemplate').value = s.wa_template || ''; $('cItem').value = s.wa_item_template || '';
  }

  $('websiteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const update = {
        store_name: $('sName').value, welcome_text: $('sWelcome').value,
        store_description: $('sDesc').value, footer_text: $('sFooter').value,
      };
      const file = $('sAvatar').files[0];
      if (file) update.profile_image_url = await T.uploadImage(file);
      const { error } = await db.from('settings').update(update).eq('id', 1);
      if (error) throw error;
      T.toast('Website settings disimpan'); loadAll();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
  });

  $('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = $('cNumber').value.replace(/\D/g, '');
    const { error } = await db.from('settings').update({
      whatsapp_number: num,
      wa_intro: $('cIntro').value,
      wa_template: $('cTemplate').value.trim() || null,
      wa_item_template: $('cItem').value.trim() || null,
    }).eq('id', 1);
    if (error) return alert('Gagal menyimpan: ' + error.message);
    T.toast('Kontak disimpan'); loadAll();
  });

  // Tunggu shared.js selesai memuat (defer).
  window.addEventListener('load', checkSession);
})();
