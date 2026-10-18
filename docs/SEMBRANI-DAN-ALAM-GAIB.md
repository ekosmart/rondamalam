# Sembrani Penembus Sukma

Wilayah baru: **Keraton Samudra Sunyi**, alam gaib dengan Ratu Selatan,
pendopo kuno, taman teratai, pemandian, gamelan, dan bos Penjaga Palung.
Ini adalah interpretasi fantasi untuk dunia Ronda Malam.

## Memulai

1. Dapatkan Kuda Sembrani dari quest Pak Mulyono: rawat lima ternak dan laporkan.
2. Buka **Jurnal → Tandai Pantai Sukma**, lalu datangi pantai di **(108, 262)**,
   di selatan Space Z.
3. Bicara dengan Juru Gerbang. Tunggangi Sembrani dan ambil tiga cahaya dengan E:
   Embun Leluhur (91, 255), Napas Angin (119, 249), Suara Ombak (128, 269).
   Saat terbang, turunkan ketinggian dengan C hingga sekitar 8 meter.
4. Gunakan gerbang dengan E sambil menunggang Sembrani pada **malam Kliwon**.
   Malam 1, 4, 7, dan seterusnya adalah Kliwon; malam berlangsung 18.00–06.00.
5. Kendalikan kuda dengan WASD atau joystick di jalan cahaya sampai gerbang keraton.
   Lintasan yang sudah dilalui dapat dipakai lagi kapan saja.

## Quest di keraton

- **Tamu dari Alam Manusia:** turun dengan B dan minta izin kepada Juru Keraton.
- **Tiga Pusaka yang Hilang:** cawan di taman barat, cermin di pendopo timur,
  dan mutiara di pemandian barat. Keris Mpu Gandring bercahaya di dekat segel palsu.
- **Gamelan Tanpa Penabuh:** gunakan gamelan timur. Petunjuk terukir di belakangnya:
  Ombak → Bulan → Angin → Bintang. Nada yang salah mengulang urutan.
- **Penjaga Palung:** Spasi menyerang, Q pusaka. Keluar dari lingkaran merah sebelum
  hantaman; fase pemulihan memberi kesempatan menyerang. Bos lebih cepat memberi
  tanda serangan setelah HP di bawah separuh. Menjauhi arena memulihkan bos.
- **Restu Ratu Selatan:** setelah menang, turun dari kuda dan menghadap Ratu.
  Hadiah satu kali: 350 koin, 8 sari gaib, 180 XP, pelana pusaka.

## Kemampuan dan kontrol alam gaib

| Kontrol | Fungsi |
| --- | --- |
| WASD / joystick | Bergerak; Sembrani lebih cepat daripada berjalan |
| E / tombol interaksi | Bicara, ambil pusaka, gamelan, peti, air teratai |
| B | Naik atau turun dari Sembrani di daratan |
| Spasi / tombol Serang | Serangan senjata yang sedang digunakan |
| Q / tombol Pusaka | Serangan kuat; cooldown 4 detik |
| V / tombol Tapak | Tapak Samudra: berjalan di perairan selama 6 detik; cooldown 16 detik |
| R / tombol Mata | Mata Sukma: menampilkan peti tersembunyi selama 10 detik; cooldown 18 detik |
| Pulang ke pantai | Selalu tersedia, termasuk saat melintasi laut atau melawan bos |

Tapak dan Mata memerlukan restu serta Sembrani yang sedang ditunggangi.
Jika Tapak berakhir saat masih di air, kuda otomatis kembali ke daratan.
Dua peti memberi masing-masing 80 koin dan 2 sari gaib, hanya sekali per save.
Air teratai dekat gerbang memulihkan HP di luar pertarungan.

Waktu, cuaca, dan serangan terhadap desa berhenti selama pemain di alam gaib.
Kalah mengembalikan pemain ke pantai bersama Sembrani dengan separuh HP.
Progres cahaya, pusaka, gamelan, kemenangan, restu, dan peti tersimpan.
HP bos dan urutan gamelan yang belum selesai diulang ketika masuk lagi.
Memuat ulang game mengembalikan pemain ke desa, sehingga tidak terjebak di dimensi.
Save lama otomatis memperoleh status quest kosong tanpa menghapus progres lain.

## Aset Blender

Dibuat melalui Blender MCP di scene tersendiri; scene pengguna sebelumnya tetap ada.

| Aset | Segitiga | File GLB |
| --- | ---: | --- |
| Keraton Samudra Sunyi | 1.230 | public/models/spirit-realm/keraton-samudra-sunyi.glb |
| Gerbang Sukma | 368 | public/models/spirit-realm/gerbang-sukma.glb |
| Penjaga Palung | 966 | public/models/spirit-realm/penjaga-palung.glb |

Sumber editable: `assets/spirit-realm/samudra-sunyi.blend`.
Script pembuat: `scripts/create-spirit-realm.py` (ubah ROOT sebelum dijalankan
di lokasi lain). JSON dalam `src/assets/spirit-realm/` adalah segitiga persis
hasil Blender, dikonversi ke Y-up. Game menggunakan geometri ini secara sinkron;
GLB tersedia untuk dipakai di editor lain. Material warna polos tanpa tekstur luar.
Bangunan kecil memakai ulang mesh keraton; geometri dan material runtime dicache.
Semua GLB ikut precache PWA pada build.

## Verifikasi

- `npm test`: aturan quest, migrasi save, syarat gerbang, reward sekali saja,
  urutan gamelan, serta kesesuaian mesh GLB dengan runtime.
- `node tests/spirit-browser.mjs`: gunakan Vite port 5175, atau set
  SPIRIT_TEST_URL ke URL dev dengan `?test=1`.
  Menguji alur quest, kontrol perjalanan, waktu desa, telegraph dan damage,
  kekalahan, replay, reward, kemampuan, tampilan ponsel, serta reload.
- `npm run build`: produksi dan pembaruan cache offline.
