# Peternakan Pak Mulyono dan Kopdes

Sepuluh model dari paket pengguna `peternakan_assets/models` disalin tanpa
mengubah binernya ke `public/models/farm`. Checksum sumber dicatat di
`assets/source/farm/manifest.json`. Loader dan animasi ada di `src/farm-assets.js`;
node kaki, kepala, ekor, sayap dan roda memakai pivot asli model. Kandang
dikeluarkan dari batch statis agar bangunan lama tidak tertinggal di belakangnya.
FarmAudio menyintesis delapan suara hewan dan mesin diesel, dengan batas jarak,
jeda, batas jumlah suara, dan penghentian saat mute/menu/interior.

Kuda peternakan: 360 koin, 28 m/detik. Traktor: 620 koin, 19 m/detik.
Keduanya tunggangan darat; B untuk naik/turun. Kuda Sembrani tetap hadiah quest
dan tetap memiliki kemampuan terbang. Hewan lama mempertahankan urutan indeks
perawatan; bebek, kambing dan babi ditambahkan sesudahnya.

Masuk Kopdes melalui E dekat Bu Ratih/pintu (74, −16). WASD atau joystick
untuk berjalan, drag untuk melihat, E/tombol Periksa di dekat pajangan untuk
transaksi. Pajangan memiliki label nama/harga dan model fisik, termasuk Mecha.
Bu Ratih di kasir belakang menerima penjualan hasil alam dan melayani upgrade.
Pusaka/racikan dipesan di meja pamerannya dengan biaya bahan yang sama.
Hadiah quest tidak masuk katalog maupun pajangan Kopdes; tetap didapat melalui quest.

Transaksi memerlukan interior aktif, panel barang yang sedang diperiksa, dan
jarak yang sesuai. Menu pos/inventaris hanya menampilkan koleksi serta tombol
pakai; istirahat dan urusan roh tetap tersedia. Waktu desa berhenti di interior.
Simpanan tetap memakai koordinat luar; reload kembali ke desa tanpa kehilangan
pembelian. Toko memiliki tombol Keluar yang selalu tersedia.

Validasi: `npm test`, `npm run test:farm-kopdes` (dev server port 5176),
`npm run build`. Pengujian browser memakai penyimpanan terisolasi.
