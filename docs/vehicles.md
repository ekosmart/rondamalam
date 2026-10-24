# Tunggangan Sukarame & Narik Ojol

Sembilan model GLB dari paket pengguna disimpan di `public/models/vehicles/`.
File asli tidak diubah; checksum SHA-256 ada di `assets/source/vehicles/manifest.json`.
`vehicle-kit.js` asli digunakan untuk kloning rig, mixer animasi, roda, kemudi, dan pintu.

## Mendapatkan tunggangan

| Tunggangan | Cara mendapatkan |
| --- | --- |
| Becak Sukarame | Pajangan Kopdes, 240 koin |
| Bajaj Jingga | Pajangan Kopdes, 480 koin |
| Bemo Kampung | Pajangan Kopdes, 620 koin |
| Oplet Sukarame | Pajangan Kopdes, 850 koin |
| Egrang Bambu | Damar dekat lapangan (−48, 105): empat tanda latihan berurutan, berjalan kaki |
| Kereta Santa | Pak Noel dekat gereja (18, −157): antarkan tiga paket |
| Naga Sulong | Ki Surya dekat jembatan timur (196, −130): kumpulkan tujuh Bola Naga unik |
| Getek Bambu | Pak Rakit di tepi sungai (138, 52): tiga ikat bambu di hutan |
| Buaya Putih | Nyai Tirta di timur sungai (173, 80): pulihkan tiga penanda air sambil menaiki getek |

Quest diminta melalui percakapan NPC dan hadiah diambil dengan kembali ke NPC.
Buka Jurnal untuk menandai NPC/tujuan berikutnya. Hadiah quest tidak dijual atau dipajang di Kopdes.
Tidak ada panel quest besar yang terus menutupi permainan.

## Kontrol

- Pilih tunggangan milik sendiri di koleksi; **B** naik/turun.
- Santa dan Sulong terbang: **T/C** atau tombol ikon naik/turun; **B** mendarat.
- Getek dinaiki dari tepi sungai atau ujung dermaga Karang Tirta/Pulau Karang.
  Getek bergerak di air saja. B mengembalikan pemain ke daratan yang aman.
- Buaya Putih dapat bergerak di darat dan air, termasuk melewati tepian sungai.

## Narik Ojol

Temui **Pak Jali**, pangkalan dekat Pasar Sore (−116, 27). Miliki minimal satu
becak/bajaj/bemo/oplet untuk mengambil order. Ada satu order aktif pada satu waktu.
Tujuan berputar di antara pasar, sekolah, kampung, Kopdes, masjid, dan peternakan.

1. Minta order kepada Pak Jali.
2. Datangi penanda jemput dengan kendaraan yang sesuai, tekan **E**.
3. Penumpang duduk di kursi model dan ikut bergerak.
4. Datangi tujuan, tekan **E** untuk menurunkan penumpang dan menerima ongkos.

Ongkos = 20 + pembulatan(jarak lurus antarhalte × 0,22) koin.
Pembayaran hanya sekali saat pengantaran selesai. Membatalkan tidak memberi koin.
Progres quest, kepemilikan kendaraan, order, jumlah perjalanan, dan penghasilan disimpan.
Saat turun/ganti ke tunggangan lain, order tetap aktif; lanjutkan dengan kendaraan penumpang.

## Implementasi

- `vehicle-data.js`: definisi, harga, NPC, titik quest, dan halte.
- `vehicle-rules.js`: progres, hadiah, sanitasi save, tarif, dan pergerakan air/darat.
- `vehicle-assets.js`: GLTF cache, kloning skeleton, animasi dan dudukan.
  Rig Egrang tambahan dalam file Santa dipisahkan saat runtime. Dudukan Egrang
  mengikuti pijakan dalam bind space, bukan ujung tulang rig.
- `vehicle-activities.js`: NPC, objek quest, interaksi, jurnal, penumpang, dan waypoint.
- `vehicle-audio.js`: suara mesin, bel becak, ketukan egrang, lonceng Santa,
  gemuruh naga/buaya, serta kecipak getek melalui Web Audio. Mengikuti pengaturan mute.

Validasi: `npm test`, `npm run test:vehicles`, `npm run test:farm-kopdes`, `npm run build`.
Uji browser memakai konteks Chrome terisolasi, tanpa menyentuh save browser pengguna.
Terminal Bus Sukarame belum termasuk pembaruan ini.
