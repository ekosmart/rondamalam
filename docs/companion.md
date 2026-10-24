# Pendamping yang berjalan dan menjaga target tangkapan

Pendamping memakai skala model liar (1), baik sebelum maupun setelah Awakening.
Halo mengikuti tinggi model. Controller `src/companion.js` memakai navigasi
terpisah yang boleh masuk pos aman dan menghindari collider. Animasi Walk/Idle
mengikuti gerakan pendamping, bukan input berjalan pemain. Hantu darat mengikuti
permukaan tanah saat pemain terbang; model melayang tetap menggunakan gerakan
bawaan aset. Pendamping yang tertinggal sangat jauh setelah perpindahan peta
dipanggil kembali ke lokasi aman di dekat pemain.

Klik/ketuk musuh untuk mengunci target. Pendamping hanya menyerang target yang
dipilih, dalam jarak perintah 125 m. Ia mendekat sebelum menyerang, memberi
damage setelah wind-up 0,35 detik dan memiliki jeda 1,5 detik antarpukulan.
Pergantian target, X/lepas target, target hilang, atau HP target sudah ≤25%
membatalkan hit yang tertunda. Tanpa target ia kembali mengikuti pemain.

`companionDamage` membatasi semua damage sumber companion, termasuk skill G
dan area Awakening: pukulan terakhir menyisakan minimal 24% HP dan target yang
sudah ≤25% tidak menerima damage lagi dari pendamping. Damage pemain tidak
diubah. Musuh tetap hidup untuk ditangkap dengan botol segel.

Validasi: `npm test`, `npm run test:companion`, `npm run build`. Tes browser
menggunakan save terisolasi: ukuran kecil/besar/Awakening, animasi, pemilihan
target, wind-up, pembatalan, navigasi penghalang, ketinggian, dan batas HP.
