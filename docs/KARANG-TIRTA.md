# Kampung Nelayan Karang Tirta

Ekspansi daratan di selatan Sukarame, terhubung melalui jalan pesisir. Buka **Jurnal → Tandai Karang Tirta**, lalu temui **Bu Sari (20, 335)**. Simpanan lama otomatis memperoleh progres pesisir kosong; inventaris dan quest sebelumnya tetap dipertahankan.

## Tempat dan aktivitas

- Rumah panggung, pelelangan ikan, warung Bu Ningsih, bengkel perahu, dan warga pesisir.
- Dermaga utama (84, 330), mercusuar (30, 440), teluk, serta Pulau Karang (190, 420).
- Tiga titik pancing pesisir. Bu Sari membeli seluruh ikan dalam tas dengan harga jual spesies yang sudah berlaku; rekor tangkapan tidak dihapus.
- Warung memulihkan HP dengan 20 koin.
- Satu Buto Ijo hijau setinggi sekitar 7,3 meter menjaga pulau pada malam hari. Ia dapat dikalahkan atau ditangkap dengan sistem botol yang sudah ada, lalu menjadi pendamping koleksi.

## Rangkaian quest

1. **Mercusuar padam.** Bicara dengan Bu Sari. Ambil lensa (−8, 352), dinamo (−24, 400), dan kabel (−24, 315). Pasang komponen di pintu mercusuar (30, 446). Hadiah 100 koin dan 50 XP; perahu penyelamat tersedia.
2. **Nelayan di tengah teluk.** Naik perahu di dermaga, selamatkan Pak Darto (133, 373) dan Mas Seno (244, 475), lalu antar ke dermaga utama. Hadiah 150 koin, 80 XP, dan kepemilikan perahu.
3. **Kapal tanpa awak.** Sandar di dermaga pulau (161, 420), ambil Segel Samudra dari kapal (195, 440), lalu kalahkan atau tangkap Buto Ijo saat malam. Kembali kepada Bu Sari dan serahkan segel. Hadiah 250 koin, 6 sari gaib, 100 XP, serta lampu hijau perahu. Dialog segel menghubungkan kisah ini dengan Ratu Selatan.

Hadiah dan pengambilan barang hanya berlaku satu kali. Buto Ijo mengikuti siklus kemunculan malam sistem hantu; mengalahkannya lagi tidak mengulang hadiah quest.

## Perahu

WASD atau joystick untuk bergerak, Shift untuk mempercepat, E atau tombol interaksi untuk menolong dan sandar. B juga dapat dipakai untuk turun ketika dekat dermaga. Perahu dibatasi ke air; berjalan kaki dibatasi ke daratan dan dermaga. Gunakan **Kembali darurat** bila ingin pulang langsung.

Penumpang tercatat permanen setelah diantar ke dermaga utama. Kembali darurat atau memuat ulang save di laut mengembalikan pemain ke dermaga dan penumpang yang belum diantar ke rakitnya. Progres quest yang sudah selesai tetap tersimpan.

## Aset Blender

Sumber: `assets/karang-tirta/karang-tirta.blend`, scene **Karang Tirta • Asset Workshop**. Dibuat melalui Blender MCP; generator tersimpan di `scripts/create-karang-tirta.py`. Ekspor GLB berada di `public/models/karang-tirta/`. Geometri segitiga yang sama dimuat game dari `src/assets/karang-tirta/`.

| Aset | Segitiga |
| --- | ---: |
| Rumah panggung | 376 |
| Mercusuar | 1.190 |
| Perahu motor | 217 |
| Buto Ijo | 1.704 |

Model hantu lain tidak diubah pada ekspansi ini.

## Verifikasi

- `npm test`: aturan quest, hadiah satu kali, migrasi save, batas laut/daratan, jumlah Buto Ijo, ukuran model, kesamaan jumlah segitiga JSON/GLB, dan regresi sistem lama.
- `npm run test:coast`: alur browser lengkap, kendali perahu, penyelamatan, tangkap Buto, pendamping, pelelangan, tampilan mobile, dan reload di laut. Server default `http://127.0.0.1:5176`; dapat diganti melalui `COAST_TEST_URL`.
- `tests/spirit-browser.mjs`: regresi quest Sembrani dan alam gaib; server dapat diganti melalui `SPIRIT_TEST_URL`.
- `npm run build`: bundle produksi dan cache aset PWA.
