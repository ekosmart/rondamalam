# Paket hantu pengguna

Sumber: paket `ronda_malam_hantu/ronda_malam_hantu` yang dilampirkan pengguna.
Ke-12 GLB disalin tanpa mengubah isi biner ke `public/models/ghosts/`.
`manifest.json` mencatat SHA-256 file sumber. Skrip `ghost-fx.js` dan
`wind-sway.js` di folder ini merupakan salinan referensi asli, bukan entry point.

Implementasi game: `src/ghost-assets.js`. Konfigurasi bob/sway/roll/flicker dan
shader bayangan Begu Ganjang diadaptasi dari skrip sumber. Animasi bekerja pada
anak model agar tidak menimpa posisi AI, ketinggian, skala pendamping, atau efek
penangkapan. GLB tanpa rig memakai gerak prosedural, bukan skeletal animation.
Material dan geometri setiap aktor dimiliki sendiri; template GLB di-cache.

ID koleksi lama tetap dipertahankan (`babi_ngepet → ngepet`,
`begu_ganjang → begu`, `keranda_terbang → keranda`, `siluman_ular → ular`,
`sundel_bolong → sundel`). Wewe Gombel memakai ID baru `wewe-gombel`, muncul
malam hari di kebun tua utara kampung sekitar (−35, −180), dapat ditangkap dan
dijadikan pendamping melalui mekanik biasa.

Suara sintesis orisinal Web Audio berada di `src/ghost-audio.js`: tiap jenis
memiliki timbre dan ritme sendiri, dengan varian idle/serang/tangkap, atenuasi
jarak, batas suara bersamaan, jeda, serta tombol preview almanak dan mute.

Untuk membuat ulang potret hanya paket baru (PowerShell, dev server aktif):

```powershell
$env:ASSET_URL='http://127.0.0.1:5176/?test=1'
$env:IMPORTED_ONLY='1'
node scripts/render-ghost-assets.mjs
```

Verifikasi: `npm test`, `npm run test:ghost-assets`, dan `npm run build`.
