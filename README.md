# TOKO HAZZE — Website Katalog Publik

Website statis (HTML/CSS/JS) untuk Netlify, dengan data dan gambar di Supabase.

## Isi folder

- `index.html`, `app.js`, `styles.css`: halaman publik (Katalog, keranjang, Testimonials, Order Proof, Contact Me)
- `admin.html`, `admin.js`: halaman admin (login email + password)
- `shared.js`: koneksi Supabase dan helper
- `config.js`: URL dan anon key Supabase
- `supabase/schema.sql`: tabel, aturan akses (RLS), dan storage gambar
- `netlify.toml`: pengaturan deploy Netlify

## 1. Buat proyek Supabase (paket gratis dulu)

1. Buat proyek baru di supabase.com, terpisah dari proyek manajemen toko.
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, lalu jalankan.
3. Buka **Authentication > Users > Add user**, buat akun admin (email + password).
4. Di **SQL Editor**, daftarkan akun itu sebagai admin:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'EMAIL-ADMIN-ANDA';
   ```
5. Buka **Project Settings > API**, salin **Project URL** dan **anon public key**.

## 2. Isi konfigurasi

Buka `config.js` dan ganti:
- `SUPABASE_URL` dengan Project URL
- `SUPABASE_ANON_KEY` dengan anon public key

Anon key boleh dipasang di website publik. Keamanan dijaga oleh aturan RLS di `schema.sql`: publik hanya bisa membaca, dan hanya admin yang bisa mengubah.

## 3. Deploy ke Netlify

1. Di netlify.com, pilih **Add new site > Deploy manually**, lalu seret folder ini (atau hubungkan ke repository GitHub).
2. Setelah terdeploy, buka URL-nya untuk mengecek tampilan.
3. Halaman admin ada di `/admin.html`. Halaman ini diberi `noindex` agar tidak muncul di mesin pencari, tetapi tetap bisa dibuka siapa saja yang tahu alamatnya. Keamanannya tetap bergantung pada login.

## 4. Mengisi konten

Buka `/admin.html`, login, lalu:
- **Manage Catalog**: tambah aplikasi, unggah foto, atur harga, jenis akun (Sharing/Private), status, dan urutan. Aplikasi dengan dua jenis akun dibuat sebagai dua baris dengan nama yang sama.
- **Manage Testimonials** dan **Manage Order Proof**: unggah gambar, atur nomor, urutan, dan publikasi (draft atau tampil).
- **Website Settings**: nama toko, welcome text, deskripsi, footer, dan foto profil.
- **Contact Settings**: nomor WhatsApp (format 62...) dan kalimat pembuka pesan.

## Catatan penting

- **Paket gratis Supabase**: proyek gratis di-pause setelah 7 hari tanpa aktivitas, dan tidak ada backup. Untuk website publik yang sudah dibagikan ke customer, pertimbangkan paket Pro.
- **Font**: "Pretty on the Inside" belum disertakan. Letakkan file font di folder `fonts/` dan aktifkan baris `@font-face` di `styles.css`. "Arial Narrow" hanya ada di komputer yang memiliki Microsoft Office, jadi website memakai fallback "Liberation Sans Narrow" atau Arial.
- **Checkout WhatsApp**: sistem hanya membuka WhatsApp dengan pesan yang sudah terisi. Customer harus menekan kirim sendiri.
- **Keranjang** disimpan di browser customer (localStorage). Data katalog, testimoni, dan proof selalu diambil dari Supabase.
- **Data pribadi**: gambar Order Proof sebaiknya sudah disamarkan (menutup nomor HP, alamat, dan data pribadi lain) sebelum diunggah.
- **Belum dikerjakan di versi ini**: tampilan 3D yang lebih kaya (ornamen bunga, papan toko, bentuk scallop) masih dasar. Bisa ditambahkan setelah fungsi utama teruji.
