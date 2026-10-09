# GitHub → Vercel → PWA → Android

Proyek versi 1.5 menggunakan Vite + Three.js, tanpa backend, kunci API, akun pemain, atau database. Build produksi berada di `dist/`. Node.js **22.x** dan `npm ci` menggunakan lockfile yang disertakan.

## 1. Periksa build

```powershell
npm ci
npm test
npm run build
npm run play
```

Buka `http://127.0.0.1:4173/`. Build otomatis membuat service worker dengan daftar dan hash seluruh aset lokal. Manifest, ikon PNG biasa dan maskable, halaman privasi, serta font lokal sudah disertakan. Tidak perlu membuat ikon lagi untuk deployment biasa.

Tes lengkap gameplay memerlukan `npm run dev` pada port 5173 dan Chrome:

```powershell
npm run test:browser
npm run test:expansion
npm run test:incidents
npm run test:rural
npm run test:frontier
node tests/frontier-extra-browser.mjs
```

Untuk menguji service worker, jalankan `npm run build` lalu `npm run test:pwa`. Tes membuka server produksi terisolasi pada port sementara. Semua tes browser memakai profil tersendiri dan tidak mengubah save pemain.

## 2. Simpan di GitHub

Buat repository kosong melalui akun GitHub Anda; tentukan nama serta visibilitasnya. Inisialisasi Git di folder proyek bila belum ada, kemudian jalankan perintah berikut dengan URL repository Anda sendiri:

```powershell
git init -b main
git add .
git commit -m "Add Ronda Malam 1.5 with weather and fishing"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Jika Git meminta identitas commit, gunakan nama/email Anda. `.gitignore` mengecualikan `node_modules`, build, file sementara, arsip ZIP, kunci penandatanganan, APK/AAB, `.env`, dan konfigurasi lokal Vercel. GitHub Actions menjalankan instalasi, unit test, build PWA, lalu menyimpan hasil `dist` sebagai artefak. File PRD lokal juga dikecualikan dari Git; source, README, dan lisensi font tetap disertakan.

## 3. Hubungkan ke Vercel

Di Vercel, pilih **Add New → Project**, impor repository GitHub tadi. Pengaturan telah disediakan melalui `vercel.json`:

| Pengaturan | Nilai |
| --- | --- |
| Framework | Vite |
| Node | 22.x |
| Install | `npm ci` |
| Build | `npm run build` |
| Output | `dist` |
| Environment variables | Tidak diperlukan |

Deploy root repository tanpa subfolder. Gunakan domain produksi HTTPS yang tetap, misalnya domain `vercel.app` yang diberikan Vercel atau domain milik Anda. Periksa halaman utama, `/manifest.webmanifest`, `/sw.js`, dan `/privacy.html`. Untuk instalasi publik/PWABuilder, gunakan deployment produksi yang tidak memerlukan login Vercel. Jangan mengganti domain aplikasi setelah dikemas sebagai Android tanpa memperbarui asosiasi domainnya.

## 4. Instal dan pindahkan save

1. Di game localhost, buka **Pengaturan → Ekspor save**. Simpan berkas JSON.
2. Di situs Vercel, gunakan **Pengaturan → Impor save**. Progres lama pada alamat itu diganti; salinan sebelumnya diunduh terlebih dahulu.
3. Tunggu status **Siap dimainkan offline**. Setelah itu gunakan tombol **Instal aplikasi** atau menu instal browser. Pada iPhone, gunakan Bagikan → Tambahkan ke Layar Utama.
4. Buka sekali, lalu uji dengan koneksi terputus. Unduhan pertama memerlukan koneksi. Browser bisa menghapus cache/save ketika data situs dibersihkan, sehingga ekspor save tetap berguna.

Save mengikuti origin (protokol, domain, port). Progres localhost tidak otomatis muncul di Vercel. Tidak ada sinkronisasi cloud. Pembaruan service worker menunggu sampai pemain memilih **Simpan & perbarui** di pengaturan. Pembaruan pertama tidak menyela permainan berjalan. Kontrol sentuh tersedia; landscape disarankan. Kualitas Hemat mengurangi beban GPU.

## 5. Kemasan Android melalui PWABuilder

PWA siap dipindai setelah URL HTTPS produksi tersedia. **APK/AAB belum dihasilkan oleh proyek ini.**

1. Masukkan URL produksi ke [PWABuilder](https://www.pwabuilder.com/), periksa manifest dan service worker, lalu pilih paket Android.
2. Tetapkan application/package ID yang Anda miliki, misalnya pola `id.namaanda.rondamalam`, versi aplikasi, ikon, dan orientation landscape. Catat ID persisnya.
3. Buat atau gunakan signing key Anda. Simpan keystore, alias dan password di tempat aman di luar repository. Gunakan kembali key yang sama untuk pembaruan. Jangan mengunggahnya ke GitHub.
4. Ambil SHA-256 fingerprint dari sertifikat signing sebenarnya. Untuk aplikasi yang dibagikan melalui Play App Signing, gunakan fingerprint **app signing certificate**, bukan hanya upload certificate. Jika menguji APK yang ditandatangani sertifikat berbeda, Anda dapat mencantumkan keduanya.
5. Buat asosiasi Digital Asset Links dari nilai asli:

```powershell
$env:ANDROID_PACKAGE_ID = 'ID_PAKET_ASLI_ANDA'
$env:ANDROID_SHA256 = 'FINGERPRINT_SHA256_ASLI_DARI_SERTIFIKAT'
npm run assetlinks
npm run build
```

Generator menolak placeholder dan menulis `public/.well-known/assetlinks.json`. Beberapa fingerprint dapat dipisahkan koma. File ini berisi identitas publik, bukan private key. Commit file tersebut lalu push untuk redeploy Vercel. Jangan membuat file asosiasi dengan fingerprint contoh.

6. Pastikan `https://DOMAIN_ANDA/.well-known/assetlinks.json` mengembalikan **200 JSON**, tanpa login atau redirect. Cache service worker sengaja melewati alamat ini. Verifikasi asosiasi TWA dengan paket yang dibuat PWABuilder.
7. Instal APK pada Android fisik. Periksa fullscreen/TWA, audio setelah tombol Mulai, kontrol landscape, save/reload, offline, dan pembaruan. Buat listing toko, rating konten, kebijakan privasi dan persyaratan publikasi sesuai kanal yang Anda pilih.

Paket TWA menggunakan browser Android untuk menjalankan game web; kompatibilitas WebGL 2 dan performa GPU perangkat tetap perlu diuji di ponsel sasaran. Uji browser otomatis tidak menggantikan pengujian APK bertanda tangan pada perangkat.

## Referensi resmi

- [Vite di Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Persyaratan instalasi PWA — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Trusted Web Activity dan Digital Asset Links — Chrome](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Dokumentasi Android PWABuilder](https://docs.pwabuilder.com/#/builder/android)
