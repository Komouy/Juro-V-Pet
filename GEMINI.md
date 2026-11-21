# Standar Pengembangan & Panduan Sistem Juro Living (GEMINI.md)

Dokumen ini berisi standar mutlak dan protokol kerja untuk pengembangan, pemeliharaan, serta penambahan fitur dalam proyek **Juro Living**. Semua modifikasi kode sumber, aset, dan sistem wajib mematuhi aturan di bawah ini secara konsisten.

---

## 1. Protokol Keterhubungan & Konsistensi Sistem (System Integration & Consistency)

Setiap kali melakukan modifikasi, pergeseran posisi, penambahan, atau penghapusan objek 3D, landmark, atau fitur gameplay, seluruh komponen sistem yang terkait **WAJIB** diperbarui secara terpadu dalam satu siklus:

1. **Model 3D & Komponen Visual**:
   - Komponen visual di `src/components/pet/environment/` dan definisi medan di `src/engine/world/mapTerrain.ts`.
   - Hindari objek bertumpuk, melayang aneh, atau menembus batas visual (sungai, void, bukit).
2. **Koordinat Dunia & Konstanta**:
   - Perbarui konstanta posisi di `src/engine/world/mapTerrain.ts` (misalnya `JURO_TRAMPOLINE_POS`, `JURO_BED_POS`, `JURO_BENCH_POS`, `JURO_SHOP_POS`, `JURO_MINE_POS`).
3. **Bounding Box Rintangan & Navigasi**:
   - Sinkronkan array `PET_OBSTACLES` di `mapTerrain.ts` agar pet Juro tidak menembus objek dan tidak terjebak di dalam geometri 3D.
4. **Waypoint Interaksi & Target Gerak**:
   - Di `src/components/pet/PetViewport.tsx`, pastikan titik jalan (`setWalkCommand`), radius deteksi tiba (`handleTrampolineArrival`, `handleBenchArrival`, dsb.), dan cooldown navigasi selaras dengan posisi fisik objek.
5. **Menu Kontekstual 3D**:
   - Menu aksi 3D wajib terjangkar di posisi dunia nyata objek tersebut (`position={[x, y + offset, z]}`), tidak boleh mengambang sembarangan di kamera atau terlepas dari landmarknya.
6. **Sinkronisasi State Store**:
   - Interaksi dengan landmark wajib memperbarui state terkait secara langsung:
     - `usePetStore`: statistik vital (kebahagiaan, energi, kebersihan, rasa lapar, afeksi).
     - `useGameStore`: pencatatan log riwayat aktivitas (`addLog`).
     - `useCaregiverStore`: pencatatan aksi pengasuh terpadu (`recordAction`).
7. **Pemicu Audio & Efek Suara**:
   - Setiap interaksi landmark dan perubahan status harus memiliki umpan balik audio yang sesuai melalui `soundEffects`.
8. **Pengujian & Validasi Build**:
   - Seluruh test di direktori `tests/` harus lulus 100% (`npm test`).
   - Build produksi (`npm run build`) harus selesai dengan 0 error.

---

## 2. Pedoman Desain Anti-AI Slop & Craft-Driven UI

Desain antarmuka Juro Living mengusung gaya retro pixel art bernuansa hangat, fungsional, dan memiliki identitas kuat.

1. **Estetika Pixel Art Terkurasi**:
   - Gunakan garis tepi berbobot tegas (`border-2 border-charcoal` atau `border-2 border-neutral-700`).
   - Warna dasar terpadu: Charcoal (`#18181B`), Juro Orange (`#F97316`), Cream Paper (`#FDFBF7`), serta aksen tanah dan dedaunan retro.
   - Opsi efek visual CRT scanlines dan font pixel (`pixel-text`) pada tipografi tertentu.
2. **Hindari Template Generik AI (Anti-AI Slop)**:
   - Dilarang membuat layout kartu mengambang berulang tanpa fungsi jelas.
   - Setiap tombol, panel, dan indikator harus memiliki fungsi konkret bagi pengalaman pengguna.
3. **DILARANG MENGGUNAKAN IKON SPARKLE**:
   - Dilarang keras mengimpor atau menggunakan ikon `Sparkles` dari `lucide-react` maupun simbol kilauan dekoratif generik AI.
   - Gunakan ikon fungsional yang merepresentasikan aksi nyata (misalnya: `ArrowBigUp`, `Footprints`, `Heart`, `Pickaxe`, `Utensils`, `BookOpen`, `Compass`).
4. **DILARANG MENGGUNAKAN EMOJI**:
   - Dilarang keras menyisipkan emoji Unicode di mana pun:
     - Tidak di antarmuka pengguna (UI/teks).
     - Tidak di kode sumber, komentar, maupun string.
     - Tidak di log konsol atau log riwayat aktivitas.
     - Tidak di pesan asisten atau respons AI.
   - Gunakan tipografi bersih, badge indikator status, atau ikon SVG/Lucide resmi.

---

## 3. Standar Bahasa: Pemisahan Sistem (UI) dan Karakter Pet Juro

Tata bahasa dalam proyek Juro Living membedakan secara tegas antara sistem software dan karakter pet virtual:

1. **Sistem, Antarmuka & Log Pengasuh (Clean Software Copywriting)**:
   - Menu, tombol, panel pengaturan, katalog toko, inventori, dan **log riwayat pengasuh** wajib menggunakan Bahasa Indonesia baku, bersih, formal, dan profesional seperti software modern pada umumnya.
   - Dilarang menyelipkan kata-kata alay, baby-talk, atau emoji di bagian sistem.
   - Contoh log & notifikasi pengasuh:
     - *"Memberikan [nama makanan] kepada Juro."*
     - *"Bermain menggunakan [nama mainan] bersama Juro."*
     - *"Juro selesai disabuni dan dibilas hingga bersih."*
     - *"Juro beristirahat di tempat tidurnya."*

2. **Karakter & Balon Dialog Pet Juro (Imut, Polos, Alami & Menyenangkan)**:
   - Juro adalah pet virtual slime yang lucu dan menggemaskan. Karakter Juro **boleh dan dianjurkan berbicara imut (*cute pet voice*) yang alami**:
     - Nada bicara polos, ceria, hangat, dan menggemaskan khas makhluk kecil.
     - Respons harus ringkas (maksimal 1-2 kalimat pendek) agar pas di balon dialog retro.
     - **Contoh gaya bicara Juro yang imut dan wajar**:
       - **Makan**: *"Wah, [nama makanan] ini enak dan manis sekali! Juro jadi kenyang."*
       - **Main**: *"Bermain [nama mainan] seru banget! Ayo lempar lagi bersama Juro!"*
       - **Mandi**: *"Airnya sejuk dan segar! Tubuh Juro jadi bersih dan wangi."*
       - **Istirahat / Bangku**: *"Angin di bukit sejuk sekali... Juro suka duduk santai di sini bersamamu."*
       - **Trampolin**: *"Lompatannya tinggi sekali! Melompat di trampolin jamur ini asyik banget!"*
       - **Tidur / Mengantuk**: *"Mata Juro sudah berat dan mengantuk... selamat malam ya."*
   - **Batasan yang Wajib Dihindari**:
     - Hindari onomatopoeia berlebihan yang diulang-ulang di setiap kalimat (seperti spam kata kaku `"Uwuu~"`, `"Boing boing~"`, `"Bloop bloop!"`).
     - Hindari cadel buatan yang berlebihan agar tetap nyaman dibaca dan tidak cringe.

3. **Perkembangan Karakter Berdasarkan Tingkat Kognitif**:
   - **Level 1 – 4 (Fase Awal)**: Polos, menggemaskan, bersuara imut dengan kalimat pendek sederhana.
   - **Level 5 – 9 (Fase Tumbuh)**: Ceria, aktif, ekspresif, banyak mengamati dan bertanya hal menarik di lembah.
   - **Level 10+ (Fase Dewasa)**: Hangat, penuh kasih, tenang, bijak, dan setia mendampingi pengguna.

---

## 4. Standar Arsitektur Audio & Volume

1. **Volume Musik Latar (BGM)**:
   - Nilai `bgmGain` dijaga pada level `0.75`.
   - Amplitudo melodi track berada pada rentang `0.18 - 0.24`, dan bass pada rentang `0.22 - 0.28`.
2. **Efek Suara (SFX)**:
   - Seluruh 40 metode efek suara di-route melalui `getSfxDestination()` menuju `masterGain`.
   - Amplitudo puncak SFX berada pada rentang `0.25 - 0.70` agar terdengar jelas dan seimbang di perangkat mobile maupun desktop.

---

## 5. Kriteria Penerimaan & Verifikasi

Sebelum menandai tugas selesai:
1. Jalankan unit test: `npm test` -> 100% lulus.
2. Jalankan build produksi: `npm run build` -> 0 error.
3. Pastikan tidak ada emoji atau ikon sparkle yang ditambahkan.
