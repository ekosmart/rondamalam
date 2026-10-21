# Penghuni Sukarame — pembaruan visual roh

Tahap pertama memperbarui Pocong, Kuntilanak, dan Genderuwo. Model low poly dibuat dari geometri Three.js dengan bagian tubuh terpisah untuk animasi: lompatan Pocong, rambut dan lengan Kuntilanak, langkah serta serangan Genderuwo. Reaksi kena serang dan efek menyusut saat ditangkap/diusir memakai model yang sama. Penangkapan, level, awakening, dan ID penyimpanan lama tetap berlaku.

## Aset

- Sumber model dan animasi: `src/folklore-models.js`.
- Tiga model portabel: `public/models/folklore/*.glb`. Ini salinan pose dasar; animasi runtime tetap di JavaScript.
- Salinan Blender yang bisa diedit: `assets/folklore/folklore-ghosts.blend`. Model GLB diimpor melalui Blender MCP ke scene terpisah, dengan scene Karang Tirta tetap tersimpan.
- Potret transparan untuk seluruh 22 roh: `public/portraits/*.png`, dirender dari model game. Roh lain masih menggunakan desain 3D sebelumnya.
- Regenerasi potret/GLB: jalankan server Vite pada port 5175, lalu `node scripts/render-ghost-assets.mjs`.

## Suara dan Almanak

`src/ghost-audio.js` membuat efek sintetis asli melalui Web Audio API: desah/lompatan Pocong, tawa pendek Kuntilanak, dan geraman Genderuwo. Ini efek suara sintetis, bukan rekaman vokal manusia. Ada variasi idle, menyerang, dan menghilang, dengan batas jarak, stereo, jeda pemutaran, serta maksimal dua suara dunia bersamaan. Suara dunia berhenti saat menu/jeda; tombol **Dengarkan suara** di detail tiga roh tetap dapat dipakai. Pengaturan suara game juga mematikan pratinjau. Tidak membutuhkan API key atau layanan audio eksternal.

Almanak menampilkan potret semua roh. Koleksi milik pemain terang dengan cahaya di tepi, sedangkan yang belum dimiliki redup dan bertuliskan **Belum dimiliki**. Detail dan kartu mengikuti status koleksi yang sama.

## Verifikasi

- `npm test`: 55 tes lulus, termasuk batas geometri, aset PNG/GLB, serta sinyal suara.
- `node tests/folklore-browser.mjs`: spawn, penangkapan nyata melalui botol, pendamping, persistensi save, 22 gambar termuat, tampilan kepemilikan, pratinjau audio, mute, cooldown/jarak/jeda, rendering stereo Web Audio, dan lebar layar ponsel.
- `npm run build`: berhasil; peringatan ukuran chunk Vite masih ada.
- Tangkapan layar hasil uji: `tmp/screenshots/folklore-almanac.png` dan `tmp/screenshots/folklore-mobile.png`.
