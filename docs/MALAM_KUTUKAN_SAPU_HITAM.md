# Malam Kutukan Sapu Hitam & Akademi Sihir

Update ini memakai 19 berkas yang diberikan: 15 GLB dan 4 HTML. Model GLB disalin tanpa perubahan; HTML diadaptasi menjadi modul Three.js, tanpa menjalankan halaman viewer, antarmuka, atau dependensi CDN asalnya. Berkas asli HTML disimpan di `assets/magic-source/`. Manifest beserta SHA-256 tersedia di `assets/magic-source/manifest.json`.

## Cara bermain dan cerita

1. Temui **Bu Laras**, penjaga mantra di selatan pos ronda `(12, 28)`, lalu pilih **Saya akan membantu**. Ia menyelidiki dua pencuri nama yang menyeberang dari Peron 13. Pemain mendapat dua ramuan.
2. Mulai malam kedua, malam yang memenuhi syarat memiliki peluang serangan 55%, satu keputusan per malam yang tersimpan saat reload. Serangan baru menunggu pemain berada di sekitar desa, tidak sedang bermain olahraga, dan tidak bersamaan dengan fase peringatan/aktif invasi besar. Jenis penyihir dipilih acak dengan peluang sama:
   - **Penyihir Rawa** (`Penyihir.glb`) mengubah warga menjadi kodok.
   - **Hollow Rider** (model dan animasi dari HTML) mengubah warga menjadi arca batu berpendar.
3. Penyihir melayang mengitari warga, menembakkan proyektil kutukan, dan secara berkala turun sehingga pusaka jarak dekat tetap dapat melawannya. Kutukan menyembunyikan NPC asli, menghentikan rutinitasnya, dan menampilkan penggantinya. Maksimal enam warga terkutuk sekaligus; korban tersimpan saat reload. Penyihir pergi saat fajar, tetapi korban tetap perlu dipulihkan.
4. Ambil ramuan di sekitar pos. **E** dekat korban memakai satu ramuan untuk memulihkannya. Minum melalui Jurnal/tombol ramuan memberikan perlindungan 25 detik, memulihkan 25 HP, dan menahan kutukan pada warga dalam radius 10 meter. Bu Laras menyediakan dua ramuan cadangan ketika persediaan habis setelah menerima quest.
5. Usir setidaknya satu jenis penyihir lalu **laporkan kepada Bu Laras**. Pemain memperoleh **Tiket Peron 13** permanen dan 100 koin. Mengusir penyihir juga memberikan 60 koin.
6. Pergi ke **Stasiun Tengah Malam** `(-185, 255)`, barat daya desa. Jalan baru melewati bagian depan ladang lalu sisi barat stasiun; kedua ladang tetap utuh. Lokasinya dapat ditandai melalui Jurnal/Peta.
7. Bicara dengan **Pak Jatmiko** di loket `(-197, 259)` dan pilih menerima penyelidikan. Buku mantra di `(-179, 258)` menyimpan urutan **Lentera → Bulan → Ombak**. Pilihan salah mengulang urutan.
8. Pada malam hari, mantra memanggil **Crimson Express**. Tunggu kereta berhenti, lalu tekan **E** dekat troli `(-173, 259)`. Dorong menggunakan WASD/joystick ke gerbang bata `(-167, 249)`. Tiket, malam, buku terpecahkan, kereta tiba, dan troli yang sedang didorong semuanya wajib. Riak/dissolve membuka lintasan, lalu layar bertransisi menuju akademi. E melepas troli; pemain tidak dapat menaiki tunggangan sambil mendorongnya.
9. Di halaman **Akademi Sihir**, minta tugas kepada **Prof. Arun** untuk meminjam tongkat. Tiga orang-orangan menyimpan jangkar kutukan. Dekati masing-masing dalam 12 meter dan gunakan **Spasi**/tombol Mantra, berurutan **Lentera → Bulan → Ombak**. Segel yang salah menolak mantra.
10. Laporkan tiga segel yang padam kepada profesor. Hadiah satu kali: **Sapu Terbang**, **Tongkat Sihir**, 250 koin, dan pemulihan seluruh korban tersisa. Kedua perlengkapan langsung dipilih. Serangan acak penyihir masih dapat terjadi pada malam berikutnya.

Gunakan **Pulang ke stasiun** kapan saja di akademi, atau E dekat gerbang samping. Penyimpanan di akademi menggunakan posisi aman stasiun, sehingga reload tidak menjebak pemain di peta terpisah. Waktu desa dijeda selama berada di akademi. Quest, buku, tiket, korban, dan hadiah tersimpan; waktu animasi kereta/troli tidak disimpan.

Setelah kembali, **B** menaiki sapu/mendarat; **T/C** atau dua tombol panah mengatur ketinggian. Tongkat menembakkan mantra berjangkauan 48 meter, termasuk sambil naik sapu. Aturan quest menggunakan dialog NPC dan Jurnal, tanpa kartu quest regional yang memenuhi layar.

Interior akademi belum dibuka. Jembatan dan bangunan luar memakai `castle.glb`; area bergerak saat ini adalah halaman, sesuai rencana aset interior pada update berikutnya.

## Struktur komponen

| Modul | Tanggung jawab |
| --- | --- |
| `src/magic/assets.js` | Memuat 15 GLB lokal sekali, menggabungkan geometri statis per material, normalisasi ukuran, instansiasi model dan tongkat. |
| `src/magic/rules.js` | Koordinat, save/migrasi, syarat portal, teka-teki, klaim tiket/hadiah yang tidak dapat diulang. |
| `src/magic/event.js` | Serangan malam, NPC terkutuk, pemulihan, dialog quest, troli/kereta/transisi, kontrol halaman akademi. |
| `src/magic/world.js` | Penempatan stasiun/peron/portal dan scene halaman akademi, penerangan, collider. |
| `src/magic/rider-model.js` | Hollow Rider beserta animasi kain; varian sapu tanpa penunggang untuk kendaraan pemain. |
| `src/magic/statue-model.js` | Arca warga dan tekstur retak/emisi yang diadaptasi dari HTML. |
| `src/magic/station-model.js` | Kit stasiun, jam, lentera, pendulum dari HTML. |
| `src/magic/portal-models.js` | Lokomotif, rel, roda/uap, dan shader bata–nebula asli (`uTime`, `uProx`). |
| `src/magic/audio.js` | Sintesis lokal Web Audio: kutukan, portal, peluit kereta, pemulihan, mantra, burung hantu; mengikuti pengaturan mute/master game. |
| `src/magic/magic.css` | Tombol kontekstual ringkas, transisi, dan tampilan halaman akademi pada desktop/mobile. |

Integrasi menggunakan `state.magic`, daftar pusaka/tunggangan yang sudah ada, sistem combat/proyektil game, lifecycle NPC desa, HUD/Jurnal, serta jalur peta. Area stasiun dicadangkan sebelum penggabungan scenery agar pohon dan rumput tidak menutupi bangunan/jalan. Warga terkutuk tidak dapat sekaligus dipilih sebagai korban invasi lain.

## Pemeriksaan

- `npm test`: aturan portal/quest, migrasi save, hadiah satu kali, validitas GLB, dan regresi game.
- `npm run test:magic`: alur dari NPC desa sampai hadiah/keluar akademi, dua jenis kutukan, save/reload korban, jalan stasiun, pembatasan siang, shader, tongkat di udara, dan waveform Web Audio; lalu layout sentuh 390×844, 320×568, 844×390.
- `tests/flight-controls-browser.mjs`: klik/tahan/lepas dan batas ketinggian lima mount termasuk sapu; tombol tidak menutupi minimap pada lima ukuran layar.
- `npm run build`: bundel produksi dan cache PWA menyertakan seluruh GLB lokal.

Tes browser memakai Chrome lokal dan server pengembangan `http://127.0.0.1:5176/?test=1`. `window.__ronda` hanya tersedia pada mode development dengan parameter tes. Tidak ada kontrol debug atau pembuka quest otomatis pada build produksi. Tangkapan layar pemeriksaan tersimpan lokal di `artifacts/`.
