---
name: juro-development-standards
description: >-
  Aturan pengembangan, integrasi sistem, standar desain anti-AI-slop, larangan ikon sparkle dan emoji,
  serta pedoman tata bahasa formal Bahasa Indonesia untuk proyek Juro Living.
---

# Juro Development Standards & System Integrity Skill

Gunakan skill ini sebagai acuan saat menambah fitur, memperbaiki bug, memodifikasi map 3D, menyusun copy antarmuka, atau mengintegrasikan state di Juro Living.

## Ringkasan Aturan Inti

1. **Sinkronisasi Sistem & Keterhubungan Fitur**:
   - Setiap modifikasi objek atau landmark 3D wajib memperbarui model 3D, konstanta posisi di `mapTerrain.ts`, array `PET_OBSTACLES`, waypoint navigasi di `PetViewport.tsx`, anchoring menu 3D, state store (`usePetStore`, `useGameStore`, `useCaregiverStore`), audio triggers, dan pengujian unit.

2. **Pedoman Desain Anti-AI Slop**:
   - Mengusung estetika retro pixel art dengan kontras tegas (`border-2 border-charcoal`), palet hangat, dan fungsionalitas nyata.
   - **DILARANG MENGGUNAKAN IKON SPARKLE**: Jangan gunakan ikon `Sparkles` dari Lucide.
   - **DILARANG MENGGUNAKAN EMOJI**: Bebas emoji di semua teks antarmuka, kode, komentar, log, dan pesan percakapan.

3. **Pemisahan Bahasa Sistem (UI) & Karakter Pet Juro**:
   - **Sistem & Log**: UI, tombol, katalog toko, dan log pengasuh wajib menggunakan Bahasa Indonesia formal, bersih, dan profesional tanpa gaya alay atau kata-kata bayi.
   - **Karakter Pet Juro**: Boleh dan dianjurkan berbicara imut (*cute pet voice*), polos, ceria, dan bersahabat secara alami. Hindari onomatopoeia berulang yang berlebihan/spam seperti kata kaku `"Uwuu~"` atau `"Boing boing~"` di setiap kalimat. Tutur kata Juro berkembang seiring level kognitifnya.

4. **Keseimbangan Audio**:
   - BGM gain dipertahankan pada `0.75` (melodi `0.18 - 0.24`, bass `0.22 - 0.28`).
   - SFX di-route melalui `masterGain` dengan amplitudo `0.25 - 0.70`.

5. **Verifikasi Wajib**:
   - Jalankan `npm test` (semua test harus lulus).
   - Jalankan `npm run build` (bebas error).
