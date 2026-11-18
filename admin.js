// Halaman admin: login Supabase Auth, lalu kelola katalog, galeri, dan pengaturan.
(function () {
  const T = window.TOKO;
  const $ = (id) => document.getElementById(id);
  let state = { products: [], testimonials: [], order_proofs: [], settings: null, categories: [] };
  let removedOptionIds = []; // pilihan yang dihapus saat sedang mengedit aplikasi

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

  // Pilihan (product_options) diurutkan sesuai sort_order.
  const withOptions = (x) => ({
    ...x,
    options: (x.product_options || []).slice().sort((a, b) => a.sort_order - b.sort_order),
  });

  async function loadAll() {
    const [p, t, s, c] = await Promise.all([
      db.from('products').select('*, product_options(*)').order('sort_order').order('created_at'),
      db.from('testimonials').select('*').order('sort_order'),
      db.from('settings').select('*').eq('id', 1).single(),
      db.from('categories').select('*').order('sort_order'),
    ]);
    if (p.error) console.error(p.error);
    state = {
      products: (p.data || []).map(withOptions),
      testimonials: t.data || [],
      settings: s.data,
      categories: c.data || [],
    };
    renderStats(); renderCategoryOptions(); renderProducts(); renderCategories(); renderGallery('testimonials'); renderSettings();
  }

  function renderStats() {
    $('statProducts').textContent = state.products.length;
    $('statTesti').textContent = state.testimonials.length;
  }

  // ===== Kategori =====
  function renderCategories() {
    $('catRows').innerHTML = state.categories.map((c) => {
      const n = state.products.filter((p) => (p.category || 'Lainnya') === c.name).length;
      return `
      <tr>
        <td>${window.TOKO_ICONS.svg(c.icon)} ${T.esc(c.name)}</td>
        <td>${n} aplikasi</td>
        <td class="row-actions">
          <button data-cup="${c.id}">▲</button>
          <button data-cdown="${c.id}">▼</button>
          <select data-cicon="${c.id}">${iconOptions(c.icon)}</select>
          <button data-crename="${c.id}">Ubah nama</button>
          <button class="danger" data-cdel="${c.id}">Hapus</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="3">Belum ada kategori.</td></tr>';
  }

  // Isi pilihan kategori di form aplikasi, dan pertahankan pilihan yang sedang dipakai.
  function renderCategoryOptions() {
    const cur = $('pCategory').value;
    $('pCategory').innerHTML = state.categories.map((c) => `<option>${T.esc(c.name)}</option>`).join('');
    if (cur) $('pCategory').value = cur;
  }

  // Pilihan ikon: dipakai di form tambah kategori dan di tabel kategori.
  const iconOptions = (current) => window.TOKO_ICONS.list
    .map((i) => `<option value="${i.key}" ${i.key === current ? 'selected' : ''}>${i.label}</option>`).join('');
  $('cgIcon').innerHTML = iconOptions('box');

  document.addEventListener('change', async (e) => {
    const s = e.target.closest('select[data-cicon]');
    if (!s) return;
    const { error } = await db.from('categories').update({ icon: s.value }).eq('id', s.dataset.cicon);
    if (error) return alert('Gagal mengubah ikon: ' + error.message);
    loadAll();
  });

  $('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('cgName').value.trim();
    if (!name) return;
    const sort = state.categories.length ? Math.max(...state.categories.map((c) => c.sort_order)) + 1 : 0;
    const icon = $('cgIcon').value || null;
    const { error } = await db.from('categories').insert({ name, icon, sort_order: sort });
    if (error) return alert('Gagal menambah kategori: ' + error.message);
    $('categoryForm').reset(); T.toast('Kategori ditambahkan'); loadAll();
  });

  // ===== Katalog (aplikasi + pilihannya) =====
  function renderProducts() {
    $('productRows').innerHTML = state.products.map((p) => {
      const list = p.options.map((o) =>
        `${T.esc(o.label)} · ${T.rupiah(o.price)} · stok ${o.stock ?? 0}${o.available ? '' : ' (nonaktif)'}`).join('<br>');
      const min = p.options.length ? Math.min(...p.options.map((o) => o.price)) : null;
      return `
      <tr>
        <td><img src="${T.esc(p.image_url || '')}" alt=""></td>
        <td>${T.esc(p.name)}</td>
        <td>${T.esc(p.category || 'Lainnya')}</td>
        <td>${list || '<i>Belum ada pilihan</i>'}</td>
        <td>${min === null ? '-' : 'Mulai ' + T.rupiah(min)}<br>${p.available ? 'Tersedia' : 'Tidak tersedia'}</td>
        <td class="row-actions">
          <button data-edit="${p.id}">Edit</button>
          <button data-up="${p.id}">▲</button>
          <button data-down="${p.id}">▼</button>
          <button class="danger" data-delp="${p.id}">Hapus</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">Belum ada aplikasi.</td></tr>';
  }

  // Satu baris pilihan di editor form aplikasi.
  function optionRow(o = {}) {
    return `
      <div class="opt-edit" data-oid="${o.id || ''}">
        <input data-f="label" placeholder="Mis. Sharing 2 user" value="${T.esc(o.label || '')}" required>
        <input data-f="price" type="number" min="0" placeholder="Harga" value="${o.price ?? ''}" required>
        <input data-f="stock" type="number" min="0" placeholder="Stok" value="${o.stock ?? 0}">
        <label class="chk"><input data-f="available" type="checkbox" ${o.available === false ? '' : 'checked'}> Tersedia</label>
        <button class="danger" type="button" data-optdel>✕</button>
      </div>`;
  }

  function renderOptionRows(list) {
    $('optRows').innerHTML = list.length
      ? list.map((o) => optionRow(o)).join('')
      : '<p class="notice">Belum ada pilihan. Tambah minimal satu.</p>';
  }

  // Baca semua baris pilihan dari form.
  function readOptionRows() {
    return [...$('optRows').querySelectorAll('.opt-edit')].map((row, i) => ({
      id: row.dataset.oid || null,
      label: row.querySelector('[data-f=label]').value.trim(),
      price: Math.max(0, Number(row.querySelector('[data-f=price]').value) || 0),
      stock: Math.max(0, Number(row.querySelector('[data-f=stock]').value) || 0),
      available: row.querySelector('[data-f=available]').checked,
      sort_order: i,
    }));
  }

  $('addOpt').addEventListener('click', () => {
    if ($('optRows').querySelector('.notice')) $('optRows').innerHTML = '';
    $('optRows').insertAdjacentHTML('beforeend', optionRow({ available: true, stock: 0 }));
  });

  function resetProductForm() {
    $('productForm').reset(); $('productId').value = ''; $('pAvail').checked = true;
    removedOptionIds = []; renderOptionRows([]);
  }
  $('pCancel').addEventListener('click', resetProductForm);

  $('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('productId').value;
    const file = $('pFile').files[0];
    const options = readOptionRows();
    if (!options.length) return alert('Tambah minimal satu pilihan, misalnya Sharing 2 user.');
    if (options.some((o) => !o.label)) return alert('Nama setiap pilihan harus diisi.');
    let image_url = id ? state.products.find((p) => p.id === id)?.image_url : null;
    try {
      if (file) image_url = await T.uploadImage(file);
      const row = {
        name: $('pName').value.trim(),
        category: $('pCategory').value,
        description: $('pDesc').value.trim() || null,
        available: $('pAvail').checked,
        image_url,
      };
      let productId = id;
      if (id) {
        const { error } = await db.from('products').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from('products').insert(row).select('id').single();
        if (error) throw error;
        productId = data.id;
      }
      // Pilihan yang dibuang dihapus, lalu pilihan lain diperbarui atau ditambahkan.
      if (removedOptionIds.length) {
        const { error } = await db.from('product_options').delete().in('id', removedOptionIds);
        if (error) throw error;
      }
      for (const o of options) {
        const fields = { label: o.label, price: o.price, stock: o.stock, available: o.available, sort_order: o.sort_order };
        const res = o.id
          ? await db.from('product_options').update(fields).eq('id', o.id)
          : await db.from('product_options').insert({ ...fields, product_id: productId });
        if (res.error) throw res.error;
      }
      T.toast('Aplikasi disimpan'); resetProductForm(); loadAll();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
  });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-optdel')) {
      const row = b.closest('.opt-edit');
      if (row.dataset.oid) removedOptionIds.push(row.dataset.oid);
      row.remove();
      if (!$('optRows').querySelector('.opt-edit')) renderOptionRows([]);
      return;
    }
    if (b.dataset.edit) {
      const p = state.products.find((x) => x.id === b.dataset.edit);
      $('productId').value = p.id; $('pName').value = p.name;
      $('pCategory').value = p.category || 'Lainnya';
      $('pDesc').value = p.description || ''; $('pAvail').checked = p.available;
      removedOptionIds = [];
      renderOptionRows(p.options);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.delp && confirm('Hapus aplikasi ini beserta semua pilihannya?')) {
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
    if (b.dataset.cup || b.dataset.cdown) {
      await swapOrder('categories', b.dataset.cup || b.dataset.cdown, b.dataset.cup ? -1 : 1, state.categories);
    }
    if (b.dataset.crename) {
      const c = state.categories.find((x) => x.id === b.dataset.crename);
      const v = prompt('Nama kategori baru:', c.name);
      if (v && v.trim() && v.trim() !== c.name) {
        const name = v.trim();
        const { error } = await db.from('categories').update({ name }).eq('id', c.id);
        if (error) return alert('Gagal mengubah nama: ' + error.message);
        await db.from('products').update({ category: name }).eq('category', c.name);
        loadAll();
      }
    }
    if (b.dataset.cdel) {
      const c = state.categories.find((x) => x.id === b.dataset.cdel);
      const n = state.products.filter((p) => (p.category || 'Lainnya') === c.name).length;
      if (n > 0) return alert(`Kategori ini masih dipakai ${n} aplikasi. Pindahkan dulu aplikasinya ke kategori lain.`);
      if (confirm('Hapus kategori ini?')) { await db.from('categories').delete().eq('id', c.id); loadAll(); }
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

  // ===== Galeri testimoni =====
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
    $('sTagline').value = s.tagline || ''; $('sHighlights').value = s.highlights || ''; $('sNotes').value = s.notes_text || '';
    $('cNumber').value = s.whatsapp_number || ''; $('cIntro').value = s.wa_intro || '';
    $('cTemplate').value = s.wa_template || ''; $('cItem').value = s.wa_item_template || '';
  }

  $('websiteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const update = {
        store_name: $('sName').value, welcome_text: $('sWelcome').value,
        store_description: $('sDesc').value, footer_text: $('sFooter').value,
        tagline: $('sTagline').value.trim() || null,
        highlights: $('sHighlights').value.trim() || null,
        notes_text: $('sNotes').value.trim() || null,
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

  renderOptionRows([]);

  // Tunggu shared.js selesai memuat (defer).
  window.addEventListener('load', checkSession);
})();
