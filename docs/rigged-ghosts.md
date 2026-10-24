# Hantu rigged dan malam Kliwon

24 GLB dari paket `ronda_malam_rigged` disalin utuh ke `public/models/ghosts`.
Checksum sumber ada di `assets/source/ghosts/manifest.json`. ID lama tetap sama
agar koleksi dan pendamping pada save lama tetap berlaku. Kitsune memakai ID
lama `yokai`. Pocong, Kuntilanak, Genderuwo, dan Buto Ijo tetap memakai model
sebelumnya karena paket ini tidak menyediakan penggantinya.

Setiap aktor memakai SkeletonUtils.clone dan AnimationMixer sendiri. Idle/Walk
berulang, Attack satu kali lalu kembali ke gerakan, Death dimainkan sampai
selesai sebelum visual memudar. Penangkapan tetap memakai efek masuk botol.
Jelangkung dan Keranda memiliki animasi objek tanpa skin; klipnya tetap dipakai.
Material, geometry, skeleton dan mixer dilepas saat visual kematian dibersihkan.

Suster Ngesot muncul di sekitar UKS Sekolah Rakyat pada malam biasa. Empat
pendatang Kliwon baru adalah Kappa, Skeleton, Slender Man, dan Biarawati Iblis.
Jumlah almanak kini 28. Semua 24 model memiliki potret yang dirender ulang dan
suara Web Audio sendiri; pengaturan mute, batas jarak dan jeda suara berlaku.

Malam Kliwon mengikuti jadwal lama: malam 1, 4, 7, dan seterusnya, pukul 18–06.
Hantu lokal termasuk kiriman Ki Wulung menyingkir selama Kliwon. Para tamu
portal menggunakan titik lokal yang bisa diinjak, dipilih berjauhan sehingga
tersebar dari utara, perkebunan dan kampung sampai Karang Tirta. Pos aman tetap
kosong. Kappa tetap di sungai, pada tiga ruas dekat lokasi pemancing. Pagi hari
para tamu menghilang; hantu lokal kembali pada malam biasa berikutnya.

Kappa dapat melintasi air dan daratan, dengan tetap menghormati collider.
Pemancing sungai beraktivitas malam hari. Kappa yang tidak sedang dilawan dapat
mendekati seorang pemancing, membawanya kembali ke sungai, dan menahannya.
Korban terlihat di atas air. Kalahkan atau tangkap Kappa untuk membebaskannya;
mengangkat Kappa dengan UFO juga melepaskan korban. Fajar mengembalikan korban
ke tepi sungai. Dialog, aktivitas memancing, kutukan penyihir dan penculikan
invasi tidak mengambil alih NPC yang sedang ditawan. Reload memulihkan NPC;
status tawanan ini sementara dan tidak menghapus quest atau NPC secara permanen.

Validasi: `npm test`, `npm run test:rigged-ghosts`, `npm run test:ghost-assets`,
`npm run build`. Tes browser memakai penyimpanan Chrome terisolasi pada port 5176.
