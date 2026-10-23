# Perkebunan dan sarang roh

Update memakai 12 GLB yang diberikan pengguna serta adaptasi `wind-sway.js`. Model biner asli disalin ke `public/models/plantation/`; sumber JS angin dan manifest SHA-256 ada di `assets/plantation-source/`. Semua aset lokal ikut cache PWA saat build.

## Lokasi

- **Kebun Sawit**: barat desa, sekitar `(-211, 91)`. Pohon sawit berbuah, tandan buah di tanah/dekat timbangan, dan tumpukan pelepah. Jalur jalan dan akses truk tetap terbuka.
- **Ladang Jagung** `(-126, 245)` dan **Ladang Gandum** `(-65, 245)`: tanaman baru, orang-orangan, jagung kering, serta gulungan jerami. Jalur silang di tengah ladang. Panen tetap memakai interaksi E dan aturan panen yang sudah ada.
- **Hutan Bambu**: diperluas dari sekitar 68 × 101 menjadi 86 × 161 meter, batas `x -280…-194`, `z -188…-27`. Terdapat 124 rumpun dan jalur berjalan utara–selatan di `x -250`, terhubung jalan utama `z -130`. Tiga kuntilanak berpatroli pada ketinggian sekitar 9–12 meter ketika malam. Mereka turun saat pemain mendekat sehingga pusaka darat tetap dapat digunakan; serangan jarak dekat menunggu perbedaan ketinggian yang masuk akal.
- **Kebun Pisang**: antara Sekolah Rakyat dan peternakan, pusat `(-124, 122)`. Pohon berbuah, anakan, daun kering, dan tiga titik pocong yang terpisah.
- **Pisang kampung**: sekitar `(-44,-80)`, `(43,-104)`, `(112,-100)`, `(-44,55)`, `(66,98)`. Setiap pohon memiliki tepat satu pocong malam, dengan titik rumah saling berjarak lebih dari 30 meter dan radius penjagaan 9 meter. Pocong pemakaman tetap tersedia. Hantu memakai sistem HP, serangan, penangkapan, respawn, suara, dan almanak yang sudah ada.

## Implementasi

- `src/plantation-data.js`: batas kawasan, titik kampung, daftar aset, dan area yang dicadangkan dari scenery lama.
- `src/plantation-world.js`: tata letak deterministik, collider, pemuatan GLB, penyesuaian skala, dan instancing dalam petak spasial 32 meter agar bagian di luar kamera dapat dilewati renderer. Tanaman tidak diletakkan menutup jalan atau bangunan.
- `src/plantation-wind.js`: adaptasi vertex shader sumber pengguna; pangkal tanaman diam dan pucuk melengkung. Waktu dibagikan, fase berbeda menurut posisi instance, dan kekuatan meningkat bertahap saat hujan/badai. Shadow depth memakai deformasi yang sama. Jagung, gandum, bambu, pisang, dan sawit bergerak tanpa memperbarui seluruh matriks setiap frame.
- `src/world-damage.js`: kerusakan cuaca diterapkan juga ke model baru. Jagung berubah menjadi model mati, gandum rebah, dan pohon runtuh; pemulihan mengembalikan visual/collider. Tampilan sederhana tersedia selama pemuatan dan ketika aset gagal dimuat.
- `src/main.js`: rumah hantu yang terkait vegetasi, patroli terbang kuntilanak, turun ke tempat terbuka, serta pembatasan serangan menurut ketinggian.

## Validasi

`npm run test:plantation` memeriksa semua aset, jarak titik pocong, spawn/collider, jalur bambu dan ladang, shader angin, kerusakan/pemulihan cuaca, perilaku kuntilanak malam/siang, dan render mobile. Screenshot ada di `artifacts/plantation-*.png`.

`npm test` menjalankan regresi aturan game. `npm run build` memeriksa bundel produksi dan cache PWA.
