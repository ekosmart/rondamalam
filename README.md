# Ronda Malam — Shift Kliwon

Game action RPG horor Nusantara dalam Three.js. Anda menjadi Hansip Kampung Sukarame, menjaga lima titik ronda dan memulihkan Segel Mustika Bumi yang dipecahkan sindikat pencuri. Dibangun dari PRD v2 dan tambahan kebutuhan dunia desa.

Versi **1.5 — Cuaca & Mancing Mania** menambahkan 11 kondisi cuaca, tornado dan petir yang memengaruhi dunia, banjir/salju dengan perlambatan gerak, serta 10 ikan dan quest Joran Tirta. Lihat [panduan cuaca dan memancing](docs/CUACA-DAN-MANCING.md).

## Mainkan

**Windows:** klik dua kali `Mulai-Game.cmd`. Node.js 22.x diperlukan; build siap main ada di `dist/`. Browser dibuka pada `http://127.0.0.1:4173`. Jika tab terbuka sebelum server siap, muat ulang sekali.

Atau jalankan:

```sh
npm run play
```

Pengembangan:

```sh
npm ci
npm run dev
```

Build dan pemeriksaan:

```sh
npm run build
npm test
npm run test:browser
npm run test:expansion
npm run test:incidents
npm run test:rural
npm run test:frontier
npm run test:weather
node tests/frontier-extra-browser.mjs
npm run test:pwa
```

Tes PWA memakai build produksi pada server tes terisolasi. Tes browser gameplay membutuhkan server pengembangan aktif pada port 5173 dan Google Chrome. Tes memakai penyimpanan browser terpisah, bukan save pemain. Test harness hanya tersedia di mode development dengan parameter `?test=1` dan tidak diekspos pada build produksi.

## Dunia dan mekanik

- Area jelajah 580 × 580 meter, dengan perkampungan, pos ronda, sawah, pemakaman, balai desa, Kopdes, dapur MBG, Sekolah Rakyat, pasar, lapangan tarkam, hutan bambu, kebun sawit, sungai, tiga jembatan, serta mata air di bawah beringin besar.
- Masjid Raya dan Pesantren Nurul Fajar di utara, serta Padepokan Ujung Alas milik Ki Wulung di barat laut. Bangunan, petak sawah, pepohonan, dan tiang ditempatkan di luar permukaan jalan; lapangan bola mempunyai jalur akses di sisi timur.
- Lima tiang aktif dipilih dari 15 tiang dalam lima sektor. Kelimanya berganti setiap malam, stabil setelah reload, dan masing-masing dapat dibunyikan sekali setiap malam. Tiap denting memberi koin dan keamanan; ronda lengkap memberi bonus.
- Siklus malam 8 menit dan siang 4 menit dengan transisi pencahayaan, kabut, bayangan, bulan, kunang-kunang, dan jadwal NPC. Awal permainan adalah malam Kliwon; acara portal berulang setiap tiga malam.
- 16 roh Nusantara (termasuk Banaspati) dan 5 roh portal global. Setiap entitas mempunyai titik asal, radius teritorial, pola gerak, dan waktu respawn. Hantu liar hanya aktif malam hari; seluruh musuh menghindari lingkaran aman pos ronda.
- Tujuh pusaka dengan satu slot equip: Kentongan Jati, Keris Petir, Obor Larung, Pecut Lidi, Senter Bawang, Tombak Tirta, dan Laras Surya (hadiah William). Serangan dasar, skill area, animasi tebasan, partikel, suara benturan, dan cooldown.
- Botol segel menggunakan proyektil balistik dengan gravitasi dan benturan penghalang. Hantu harus memiliki HP ≤ 25%. Peluang tangkap naik dari 68% mendekati 97% ketika HP makin rendah; tangkapan dapat gagal.
- Satu hantu pendamping, perolehan EXP, level 1–5, awakening di pos, transformasi visual, serta ultimate. Sinergi Api + Angin = Tornado Api; Air + Tanah = Akar Pasang; elemen sama = Resonansi.
- Crafting pusaka dan botol; empat jalur upgrade karakter: HP, serangan, stamina, dan pengurangan damage. Bahan dapat diambil dari dunia dan diperoleh dari musuh serta quest.
- Tujuh tunggangan kolektibel: Sepeda Onthel, BMX Tarkam, Motor Bebek, Naga Geni (700 koin), Mecha Gundam Penjaga (950 koin), UFO hadiah quest E.T., dan Kuda Sembrani hadiah Pak Mulyono. Tunggangan selain UFO/Sembrani dibeli di Pos Ronda → Tunggangan. Sepeda/motor membuat Hansip turun saat menyerang. Naga terbang dengan ketinggian otomatis di atas bangunan/pohon dan api otomatis pada musuh yang diklik dalam jangkauan 38 m horizontal / 58 m ruang. B mencari titik pendaratan bebas penghalang. Mecha mempunyai plasma jarak jauh, tebasan energi Q, dan perisai kebal sihir; serangan fisik manusia tetap mengurangi HP.
- NPC interaktif dengan jadwal, termasuk 7 pedagang, 9 pembeli berjalan, 4 petani, 3 pemanen sawit, kiai dan santri. Dua kerbau dan truk bermuatan tandan sawit melengkapi aktivitas desa. Quest cerita dan aktivitas, termasuk pemulihan Mustika Bumi. Cerita warga, maling, sindikat curanmor, begal, koruptor fiktif, dan caleg yang menawarkan amplop; pemain dapat menolak dan melaporkannya.
- Ki Wulung mengirim empat ancaman setiap malam mulai 19:30: tuyul mengambil tabungan, babi ngepet mengambil kas, kuyang meneror rumah Bu Rini, dan Banaspati membakar Rumah Pak Hadi. Kiriman bergerak lewat rute jalan menuju rumah yang berbeda dan merusak keamanan/kas warga jika dibiarkan. Penanda merah di peta menunjukkan kiriman. Tekan E di dekat rumah terbakar untuk memadamkan api (dua kali, 10 stamina per tindakan). Dua sari gaib di altar dukun menghentikan kiriman malam itu. Kiriman berbeda dari hantu liar yang tetap terikat wilayahnya.
- Copet pasar aktif siang hari dan mengambil koin pemain yang didekati. Mengamankannya mengembalikan uang curian beserta imbalan penangkapan.
- Piala Tarkam: temui Bang Jalu di sisi barat lapangan. Pertandingan 3 lawan 3 dengan bola fisik, dribel, tembakan, operan, dan lawan AI. Menang semifinal 90 detik lalu final 90 detik memberi piala dan 350 koin; seri/kalah bisa dicoba lagi.
- Bocil Gowes: temui Dimas di simpang sebelah selatan pos. Balapan melawan tiga NPC, 10 checkpoint berurutan per lap, dua lap, batas 180 detik. Pemenang menerima 180 koin. Jalan keluar lintasan memperlambat sepeda. Waktu dunia dan ancaman berhenti selama minigame; kamera/tunggangan semula dikembalikan setelah selesai. Hadiah koin setiap jenis olahraga tersedia sekali per nomor malam, dengan rekor/piala disimpan.
- HUD minigame ringkas di pojok kiri atas; petunjuk, Jeda, dan Keluar berada di tepi bawah. HUD ronda serta pendamping disembunyikan sementara, dan minimap kecil tetap tersedia saat balap. Seragam Tarkam: biru bergaris putih = Sukarame, jingga bergaris gelap = lawan. Lingkaran biru menandai kawan, wajik jingga menandai lawan, segitiga kuning menandai karakter yang dikendalikan. Seragam Hansip serta pendamping kembali setelah pertandingan.
- Kehabisan HP menyebabkan respawn di pos, tanpa game over. Penalti 15% koin, minimum 15 koin dan maksimum saldo yang dimiliki. Pos memulihkan HP dan menyediakan istirahat untuk melewati fase waktu.
- Minimap, peta dunia dengan penanda tujuan, almanak, inventori, pengaturan audio/kualitas, kontrol sentuh dasar, dan penyimpanan otomatis setiap 10 detik serta pada progres penting.

## Ekspansi 1.2 · Payung Korp & Orion

- Pabrik Payung Korp selesai dibangun saat fajar pertama; save lama langsung memperoleh pabrik. Prof William berada di timur laut (227, −212). Tiga tabung riset di halaman pabrik membuka **Laras Surya**, pusaka proyektil 105 m, bonus 50% damage zombie dan ledakan Q. Tekan **Tandai tujuan cerita** dalam dialog untuk melacak bahan berikutnya.
- Wabah zombie dan invasi alien muncul acak mulai 19:30–21:29. Urutan tersimpan per desa: setiap blok empat malam memiliki satu malam zombie, satu alien, satu dinosaurus, dan satu tenang; event baru mulai setelah pabrik dibuka. Empat gelombang, dengan sela singkat; gelombang berikutnya datang setelah musuh habis atau sekitar 73 detik, selama batas jumlah musuh memungkinkan. Waktu berhenti ketika menu/minigame aktif.
- Zombie mengikuti jalur menuju rumah/masjid dan menginfeksi warga. **Tiran Payung**, bos terakhir setinggi sekitar 9 meter, meruntuhkan rumah. Santri melindungi masjid/kiai dan membantu membasmi ancaman. Lumpuhkan warga terinfeksi, lalu **E** untuk memakai serum. William meracik serum dari 2 daun obat + 1 sari gaib. Saat pagi zombie terbakar menjadi abu; korban dan ternak pulih gratis. Rumah rusak otomatis utuh dan menampilkan NPC bergotong royong.
- Misi kedua William memerlukan total 12 zombie, misi tabung selesai, dan kepemilikan mecha. Upgrade memasang jet, sayap, serta peluncur punggung: **V** berganti terbang/berjalan, **T/C** ketinggian, **H** tiga misil berpemandu (cooldown 6 detik, jangkauan 120 m), **Spasi** plasma. Terbang menghindari bangunan; mendarat mencari lokasi yang aman.
- Bintang jatuh mengumumkan portal Orion. Alien darat dan UFO menyerbu empat gelombang. Sinar penarik mengangkat warga, santri, atau kerbau; UFO membawanya ke kapal induk. Jatuhkan pengangkut untuk menyelamatkan sandera sebelum transfer. Bos **Kapal Induk Orion**, selebar sekitar 48 meter, menyerang desa. Mengalahkannya membebaskan seluruh sandera, termasuk yang sudah ditransfer pada malam yang sama. Saat pagi seluruh alien mundur; semua sandera kembali sehat secara otomatis.
- E.T. ada di sudut tenggara (259, 224). Temukan tiga komponen UFO, terima tiga sel bintang, aktifkan suar di sebelah barat reruntuhan, lalu lapor kembali. E.T. pulang lewat portal dan meninggalkan **UFO Sahabat Bintang**. UFO bisa terbang, mengatur ketinggian, mendarat, dan menembak pulsa ion. Hadiah ini hanya dari quest.
- Gelombang, HP musuh, kondisi rumah/warga, sandera, teknologi, dan hadiah quest ikut tersimpan. HUD event berada di tepi layar. Model, animasi, partikel dan audio baru dibuat langsung secara prosedural.

## Ekspansi 1.3 · Gotong Royong & Sayap Sembrani

- Setiap fajar, semua rumah rusak dipulihkan gratis beserta collider-nya. Pekerja NPC tampil membangun selama 12 detik. Warga/ternak terinfeksi atau diculik kembali sehat. Tidak ada hadiah penyelamatan otomatis saat fajar; menolong mereka saat malam tetap memberi progres. Pemulihan hanya sekali setiap pagi dan ikut tersimpan.
- Lima rumah tambahan dengan sepuluh warga aktif siang dan malam di kampung utara.
- Peternakan barat daya memiliki dua sapi, dua kuda, dua ayam, dua domba, dan satu anjing penjaga. Hewan berjalan, dapat diculik dan terinfeksi menjadi musuh berwujud hewan. Anjing membantu menyerang zombie dekat peternakan.
- Pak Mulyono (−112, 207) memberi quest **Sayap penjaga ternak**: rawat lima hewan berbeda dengan E atau selamatkan ternak selama quest aktif. Hadiah **Kuda Sembrani**, kuda putih bersayap dengan animasi sayap, terbang, hindari penghalang, dan pendaratan aman.
- Quest lanjutan hologram E.T. **Gravitasi sahabat bintang** memerlukan quest pulang selesai, UFO dimiliki, serta total tiga pesawat alien dijatuhkan. Sinar pengangkat: klik musuh dalam 38 meter, **U** angkat, **U** lagi jatuhkan. Musuh tidak bergerak/menyerang selama diangkat. Damage jatuh mengikuti ketinggian, maksimum 280.
- Misil mecha dan jatuhan UFO bersifat fisik, sehingga hantu kebal. Plasma mecha, energi UFO, serta pusaka tetap efektif. Zombie, alien, kendaraan musuh, dan penjahat menerima damage fisik. Hantu tetap dapat diangkat.
- Semua musuh mengikuti level Hansip, termasuk kiriman dukun dan bos invasi. Setiap level di atas 1 menambah 16% HP dasar dan 9% daya serang dasar; persentase HP tersisa dipertahankan ketika level berubah. Level terlihat pada HUD target.
- Gereja Santa Maria di sebelah barat Masjid Raya, dengan dua menara runcing, jendela mawar, dan lengkung bergaya katedral yang terinspirasi Katedral Jakarta. Temui Pastor Daniel dan tiga biarawati.
- PWA installable dengan manifest, ikon, service worker offline, pembaruan atas pilihan pemain, fullscreen, serta ekspor/impor save. **Pengaturan** menyediakan tombol-tombolnya. Progres lama kompatibel.

Persiapan GitHub, Vercel, dan PWABuilder Android tersedia di [panduan deployment](docs/DEPLOYMENT.md). Belum ada publikasi jarak jauh atau APK bertanda tangan; tahap itu memerlukan repository/domain dan identitas signing milik Anda.

## Ekspansi 1.4 · Sungai & Bintang Sukarame

- Air sungai, mata air, telaga ladang, dan saluran sawah berwarna biru dengan tekstur arus, bump map dan riak bergerak. Empat NPC memancing dengan joran, senar dan pelampung. Semua tepi sungai dapat dipancing, bukan hanya titik NPC.
- **Kopdes / Bu Ratih (74, −16)** menjadi toko nyata. Joran Bambu 65 koin, umpan 3 koin, upgrade reel 180 koin; kapsul, ikan, panen, botol dan bahan crafting dapat dibeli/dijual. Beli joran dan umpan → dekati air → **E** melempar → tunggu sambaran → **E** menarik. Terlalu cepat, terlambat, atau berjalan menjauh menggagalkan tangkapan; umpan tetap terpakai. Reel memperpanjang jendela tarikan dari 2 menjadi 3,5 detik dan meningkatkan peluang ikan langka. Hasil tangkapan masuk tas, tidak langsung menjadi uang.
- Ladang jagung (−126, 245) dan gandum (−65, 245) berisi ribuan tanaman 3D melalui instancing. **E** memanen lima hasil per petak per giliran siang/malam. Panen dapat dititipkan di rumah atau dijual di Kopdes.
- **Kuda Sembrani** mendukung serangan pusaka **Spasi/Q** dari udara tanpa turun. Senjata jarak dekat mengirim tebasan energi menuju target dalam 42 m, sedangkan Laras Surya menjangkau 105 m. Damage menggunakan pusaka yang dipakai dan upgrade karakter.
- **Mas Elon / Space Z (66, 207)** memberi quest menangkap dua alien darat pada HP ≤25%: klik target lalu **R** dengan kapsul. Bekal awal lima kapsul hanya diberikan sekali. Tiga pasukan Divisi Z bergerak melintasi desa, melumpuhkan alien, dan menahannya di ruang riset. Tangkapan pasukan tidak menggantikan tugas pribadi pemain. Selesaikan dan laporkan misi untuk memperoleh izin roket.
- Roket di (78, 215) membuka **scene antariksa terpisah yang dapat dijelajahi**: Bulan Sukarame, Ares Merah, dan Nebula Kliwon. **WASD** bergerak, **T/C** vertikal, **Shift** melaju; petunjuk arah tujuan tersedia di HUD. Dekati permukaan, **E** mengambil kristal sekali per lokasi. Kristal dapat dijual di Kopdes. Tombol Pulang mengembalikan pemain ke kompleks Space Z.
- **Serbuan Meteor Purba** menjadi event malam acak ketiga. Meteor jatuh dekat sarang (−244, 168); tiga gelombang raptor disusul gelombang akhir **T-Rex Meteor**. Raptor memburu warga/santri/ternak lalu membawa mereka ke sarang. Kalahkan pembawa atau dekati sarang dan **E** untuk membebaskan. Bos kalah membebaskan semua tawanan. Fajar membuat dino mundur lewat darat; warga dan ternak pulih mengikuti aturan gotong royong.
- **Dr John / Sukarame Park (−230, 212)** memberi misi dua jenis dinosaurus berbeda. Setelah meteor pertama muncul Velociraptor, T-Rex, Brontosaurus, Stegosaurus dan Pteranodon, masing-masing di wilayah terpisah. Pteranodon bertengger di pohon sawit. Model memiliki skala pendekatan yang berbeda: raptor kecil, T-Rex besar, Brontosaurus berleher tinggi. **E** memberi tiga pakan (ikan untuk karnivora, daun untuk herbivora), klik lalu **R** melempar kapsul; alternatifnya lemahkan sampai HP ≤25%. Bekal quest: lima kapsul, enam ikan, enam daun. Koleksi tercatat di Bekal dan memberi **GyroBall**: bola transparan dengan kursi dan cincin yang berputar saat berjalan. Satwa koleksi dipindahkan ke catatan konservasi, bukan pendamping tempur.
- **Rumah Pak Hansip (15, −2)** berada di samping pos ronda. **E** masuk ke scene interior berisi sofa, TV, meja, dapur, tempat tidur, lemari, dan peti. Bicara dengan **Yuli, Aqila, Azkia**, istirahat, serta titipkan/ambil barang dan koin. Tabungan peti tidak terkena penalti respawn. Waktu desa berhenti di rumah dan antariksa. Menutup game tetap menyimpan barang/progres; saat dimuat ulang pemain berada di desa.
- Semua progres baru kompatibel dengan save lama, ekspor/impor, dan PWA offline. Aset prosedural serta audio lokal dibundel bersama game.

## Kontrol

| Tombol           | Aksi                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| WASD / panah     | Bergerak relatif terhadap kamera                                        |
| Shift            | Lari menggunakan stamina                                                |
| Klik tubuh musuh | Kunci target; naga menyembur otomatis                                   |
| X                | Lepas target                                                            |
| Spasi / 1        | Serangan dasar; plasma saat memakai mecha; tembak bola saat Tarkam      |
| Q                | Skill pusaka / tebasan energi mecha / oper bola saat Tarkam             |
| G                | Skill hantu pendamping                                                  |
| R                | Botol untuk roh; kapsul untuk dino jinak / alien darat yang dikunci |
| E                | Interaksi terdekat, pancing/tarik, panen, pakan, peti dan sampel antariksa |
| B                | Naik / turun tunggangan; mendaratkan tunggangan terbang                               |
| T / C            | Naik / turun ketinggian tunggangan terbang (minimum mengikuti penghalang di bawahnya) |
| V / H            | Mecha upgrade: berganti mode terbang–jalan / salvo misil berpemandu       |
| U                | UFO upgrade: angkat / jatuhkan target musuh |
| F                | Nyalakan / matikan senter                                               |
| Drag mouse       | Putar kamera                                                            |
| Scroll           | Zoom kamera                                                             |
| I / J / M / P    | Bekal / jurnal / peta / pos ronda                                       |
| Esc              | Jeda atau tutup panel                                                   |

Mulailah dengan berbicara kepada Pak Wiryo. Sepeda sudah dimiliki sejak awal. Tekan M dan pilih tiang untuk menandai tujuan. Lemahkan Pocong hingga HP ≤25%, lalu R; kebutuhan pukulan mengikuti level musuh. Kembali ke pos untuk crafting, equip, upgrade, dan awakening.

Progres versi sebelumnya dimigrasikan otomatis: inventori, koin, quest, dan jumlah tiang yang sudah dibunyikan tetap dipertahankan. Slot penyimpanan masih menggunakan origin/port browser yang sama.

## Aset dan arsitektur

Semua model dunia, tokoh, hantu, kendaraan, senjata, tekstur lingkungan, ikon, partikel, pencahayaan, serta efek suara dibuat langsung melalui kode proyek. Audio dibuat dengan Web Audio (suara kentongan, serangan, lempar botol, tangkapan, angin, jangkrik, dan burung), sehingga tidak memerlukan unduhan audio atau model eksternal. Font Barlow dan Cormorant Garamond dibundel lokal melalui Fontsource (lisensi SIL OFL). Tidak ada permintaan CDN saat game produksi berjalan.

| Modul                                      | Tanggung jawab                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/main.js`                              | Loop game, input, kamera, pertarungan, proyektil, AI, partikel, interaksi                     |
| `src/world.js`                             | Dunia, bangunan, tumbuhan, penghalang, cahaya, siklus visual, batching geometri               |
| `src/models.js`                            | Model 3D prosedural, karakter berartikulasi, animasi, pusaka, kendaraan, roh                  |
| `src/state.js`                             | Aturan ekonomi, crafting, quest, progres, tangkapan, awakening, save                          |
| `src/data.js`                              | Roster, wilayah, pusaka, NPC, dialog, quest, tunggangan                                       |
| `src/ui.js`                                | HUD, dialog, inventori, bengkel, peta, almanak, aksesibilitas keyboard                        |
| `src/layout.js`                            | Rencana jalan, sektor tiang, rute balap, rumah sasaran kiriman                                |
| `src/expansion-world.js`                   | Masjid, pesantren, padepokan, truk, arena olahraga                                            |
| `src/expansion-models.js`                  | Naga, mecha, warga, kerbau, truk panen                                                        |
| `src/village-life.js`                      | Jadwal dan gerak warga, kiriman dukun, kebakaran                                              |
| `src/minigames.js` / `src/sports-rules.js` | Pertandingan bola dan balap checkpoint                                                        |
| `src/mount-combat.js`                      | Semburan naga, plasma dan perisai mecha                                                       |
| `src/incidents.js` / `src/incident-rules.js` | Event acak, gelombang, infeksi, penculikan, penyelamatan dan simpanan |
| `src/incident-navigation.js` | Pencarian jalur A* mengitari penghalang dan zona aman |
| `src/incident-models.js` / `src/incident-world.js` | Zombie, alien, kapal, lab, reruntuhan, upgrade mecha |
| `src/ranged-combat.js` | Laras Surya dan misil berpemandu 3D |
| `tests/incidents.test.js` / `tests/incidents-browser.mjs` | Jadwal, migrasi, quest dan 27 pemeriksaan alur ekspansi |
| `src/rural-world.js` / `src/rural-models.js` / `src/rural-life.js` | Gereja, peternakan, Sembrani, warga dan pemulihan pagi |
| `src/combat-rules.js` / `src/tractor-beam.js` | Level musuh, aturan fisik, sinar pengangkat |
| `src/pwa-client.js` / `src/save-transfer.js` | Instalasi, pembaruan dan transfer progres |
| `scripts/build-pwa.mjs` / `vercel.json` | Cache offline berisi seluruh build dan konfigurasi hosting |
| `tests/rural-browser.mjs` / `tests/pwa-browser.mjs` | Alur ekspansi desa, offline dan pembaruan produksi |
| `src/audio.js`                             | Sintesis suara dan ambience                                                                   |
| `tests/state.test.js`                      | Tes aturan gameplay tanpa browser                                                             |
| `tests/browser.mjs`                        | 27 pemeriksaan integrasi dasar serta screenshot desktop/mobile                                |
| `tests/expansion.test.js`                  | Pergantian tiang, migrasi save, checkpoint balap, aturan turnamen                             |
| `tests/expansion-browser.mjs`              | 36 pemeriksaan ekspansi: tata ruang, target klik, warga, tunggangan, kiriman, kejuaraan, save |

Ini versi playable dengan gaya 3D low-poly prosedural, single-player, dan penyimpanan lokal browser. Bangunan utamanya merupakan eksterior; rumah Pak Hansip memiliki interior terpisah, sementara multiplayer dan backend akun belum tersedia. Navigasi invasi memakai pencarian jalur A* di grid; hantu liar memakai penghindaran penghalang dan batas wilayah. Audio aktif setelah tombol Mulai ronda ditekan. Membuka game di browser, origin, atau port berbeda membuat slot penyimpanan terpisah. Desktop Chrome/Edge dengan WebGL 2 adalah target utama; kualitas Hemat menonaktifkan bayangan dan menurunkan resolusi render.

## Referensi implementasi

- PRD lokal: `PRD_Ronda_Malam_Shift_Kliwon_v2.pdf`.
- [Dokumentasi WebGLRenderer Three.js](https://threejs.org/docs/pages/WebGLRenderer.html).
- [InstancedMesh Three.js](https://threejs.org/docs/pages/InstancedMesh.html).
