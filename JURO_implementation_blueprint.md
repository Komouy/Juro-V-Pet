# JURO — Virtual Pet
## Implementation Blueprint v1.0

> **Prinsip utama:**
> Juro harus terasa seperti makhluk hidup yang kebetulan tinggal di dalam website — bukan sekadar dashboard dengan model 3D yang ditempel di tengahnya.

---

## 1. Product Vision

| Elemen | Konsep |
|---|---|
| **Product name** | JURO |
| **Product type** | Web-based Virtual Pet |
| **Main character** | Juro, orange jelly slime |
| **Experience** | Interactive, playful, cozy |
| **Platform** | Desktop & mobile web |
| **Rendering** | Real-time 3D |
| **Primary theme** | White & Orange |
| **Secondary theme** | Charcoal / Dark |

**Core experience:**
- Merawat Juro
- Bermain dan berinteraksi dengannya
- Mengamati perilaku dan personality-nya
- Membuka item dan customization
- Membantu Juro tumbuh dan berkembang

---

## 2. Design System & Color Palette

**Filosofi warna:** Putih menjadi warna dominan. Orange menjadi identitas Juro. Charcoal untuk elemen yang membutuhkan kontras.

### Primary Palette

| Token | Hex | Nama |
|---|---|---|
| `--color-white` | `#FFFFFF` | Pure White |
| `--color-orange` | `#F97316` | Juro Orange |
| `--color-charcoal` | `#171717` | Charcoal |
| `--color-warm-white` | `#FFF7ED` | Warm White |
| `--color-soft-orange` | `#FED7AA` | Soft Orange |
| `--color-muted` | `#737373` | Muted Gray |

### Dark Mode Palette

| Token | Hex |
|---|---|
| Background | `#171717` |
| Surface | `#262626` |
| Accent | `#F97316` |

> Dark mode menggunakan charcoal, bukan hitam pekat. Orange tetap menjadi accent utama.

### UI Style

- **Rounded corners:** 12–20px
- **Typography:** Plus Jakarta Sans atau Inter
- **Button:** charcoal + teks putih, atau orange + teks putih
- **Card:** putih + border abu-abu sangat tipis
- **Shadow:** lembut, tidak berlebihan
- **Icon:** Lucide
- **Animasi:** playful tetapi tidak mengganggu

### Pembagian Warna per Elemen

| Elemen | Warna |
|---|---|
| Main background | White |
| Pet environment | Warm White |
| Primary button | Charcoal |
| Secondary button | White + border |
| Active state | Orange |
| Pet status | Orange + Soft Orange |
| Input | Charcoal / white surface |

---

## 3. Technology Stack

### Frontend Core

| Library | Peran |
|---|---|
| React + Vite | Framework utama |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Motion | Animasi UI |

### 3D & Character

| Library | Peran |
|---|---|
| Blender | Asset creation |
| Three.js + React Three Fiber | Real-time 3D rendering |
| Rapier | Physics (opsional) |

### State & Data

| Library | Peran |
|---|---|
| Zustand | State management |
| IndexedDB / Dexie | Local save |
| Supabase | Authentication & cloud save |
| Zod | Validasi data |

### Development & Testing

| Tool | Peran |
|---|---|
| Vitest | Unit testing |
| Playwright | Browser testing |
| ESLint + Prettier | Code quality |

> **Prinsip arsitektur penting:** UI dan sistem karakter harus terpisah. Juro boleh mengalami perubahan animasi puluhan kali per detik tanpa membuat seluruh React interface ikut melakukan render ulang.

---

## 4. Character Development — Juro Engine

Bagian paling penting dari project.

### A. Character Modeling

Model Juro dibuat menggunakan **Blender**.

**Spesifikasi awal:**
- Bentuk tubuh organik membulat
- Warna dasar warm orange
- Material glossy jelly
- Mata hitam ekspresif
- Mulut sederhana
- Tangan dan kaki mungil
- Mesh cukup rapat untuk deformasi

**Format output:** `.glb`

### B. Jelly Deformation System

Kombinasi teknik rendering untuk ilusi slime yang meyakinkan dengan biaya rendering rendah:

| Teknik | Fungsi |
|---|---|
| Vertex Shader | Deformasi permukaan |
| Spring Dynamics | Efek kenyal |
| Squash & Stretch | Gerakan kartun |
| Shader Material | Efek glossy / translucent |
| Mesh Deformation | Perubahan bentuk tubuh |

### C. Character Behavior Engine

Juro memiliki state machine sendiri:

```
Idle → Wander → Curious → Play → Happy
                                    ↓
                              Sleep → Dragging
                                         ↓
                                      Eating
```

Setiap state memiliki:
- Animasi
- Durasi
- Kondisi masuk
- Kondisi keluar
- Prioritas behavior

> Juro tidak boleh berjalan-jalan saat sedang tidur atau sedang dipegang pengguna.

### D. Interaksi dengan Pengguna

| Interaksi | Deskripsi |
|---|---|
| Drag & Stretch | Juro bisa dipegang dan ditarik |
| Bounce & Jump | Reaksi fisik saat dilepas |
| Cursor Tracking | Juro mengikuti pergerakan kursor |
| Sleep & Rest | Juro beristirahat secara mandiri |

---

## 5. Application Layout

### Halaman Aplikasi

| Page | Isi |
|---|---|
| **Home** | Juro dan lingkungan bermain |
| **Activities** | Feed, play, sleep, clean |
| **Collection** | Aksesori dan item |
| **Evolution** | Growth dan perkembangan |
| **Journal** | Riwayat aktivitas Juro |
| **Settings** | Tema, suara, dan preferensi |

### Home Layout (Desktop)

```
┌──────────────────────────────────────────┐
│ JURO              Collection   Settings  │
├────────────┬─────────────────────────────┤
│            │                             │
│  Pet Info  │                             │
│            │         JURO                │
│  Happiness │       (3D Slime)            │
│  Energy    │                             │
│  Hunger    │                             │
│            │                             │
│            │   [Feed] [Play] [Sleep]     │
│            │                             │
├────────────┴─────────────────────────────┤
│           Activity / Journal             │
└──────────────────────────────────────────┘
```

> Pada desktop, Juro menjadi pusat perhatian. Pada mobile, layout berubah menjadi satu kolom dengan area karakter yang tetap luas.

---

## 6. Virtual Pet System

### Pet Attributes

| Attribute | Rentang | Pengaruh |
|---|---|---|
| Hunger | 0–100 | Kebutuhan makan |
| Energy | 0–100 | Kemampuan beraktivitas |
| Happiness | 0–100 | Tingkat kebahagiaan |
| Cleanliness | 0–100 | Kebersihan |
| Affection | 0–100 | Kedekatan dengan pengguna |

**Mood dihitung dari kombinasi atribut, bukan diubah secara acak:**

- Hunger rendah → Juro mulai lapar
- Energy rendah → Juro mengantuk
- Happiness tinggi → Juro lebih aktif
- Affection tinggi → Juro lebih sering mendekati pengguna

> **Catatan desain:** Kebutuhan Juro tidak boleh terasa seperti kewajiban yang menghukum pengguna. Kalau pengguna tidak membuka website selama beberapa hari, Juro tidak mati atau kehilangan seluruh progress.

Gunakan **timestamp** untuk menghitung perubahan kebutuhan saat pengguna kembali membuka website — bukan timer yang terus-menerus berjalan di browser.

---

## 7. Development Roadmap

### Phase 01 — Foundation
- Setup React + Vite + TypeScript
- Setup Tailwind dan design tokens
- Membuat responsive layout
- Membuat navigasi dan komponen UI

**Output:** Website skeleton yang sudah bisa digunakan.

---

### Phase 02 — Juro Character
- Modeling Juro di Blender
- Export GLB
- Integrasi React Three Fiber
- Idle animation dan jelly material
- Drag, cursor tracking, bounce

**Output:** Juro sudah hidup dan bisa dimainkan.

---

### Phase 03 — Behavior Engine
- State machine
- Mood dan personality
- Wander behavior
- Interaction priority
- Character reaction

**Output:** Juro bisa berperilaku secara mandiri.

---

### Phase 04 — Virtual Pet Core
- Hunger, energy, happiness
- Feeding dan playing
- Sleeping dan cleaning
- Progression dan reward

**Output:** Juro sudah menjadi virtual pet yang fungsional.

---

### Phase 05 — Persistence
- Local save (IndexedDB)
- Supabase authentication
- Cloud synchronization
- Inventory dan customization

**Output:** Progress pengguna tersimpan dengan baik.

---

### Phase 06 — Polish & Release
- Dark mode
- Mobile optimization
- Accessibility
- Testing dan bug fixing
- Deployment

**Output:** Juro siap dipublikasikan.

---

## 8. Performance & Optimization

Performa adalah persyaratan sejak awal, bukan pekerjaan tambahan setelah selesai.

### Target Internal

| Area | Target |
|---|---|
| UI interaction | Responsif |
| Character animation | 60 FPS pada perangkat memadai |
| Low-end devices | Adaptive 30 FPS bila perlu |
| Initial loading | UI muncul sebelum 3D selesai |
| 3D assets | Lazy loading |
| Memory | Hindari canvas dan texture duplikat |
| Mobile | Quality scaling |
| Accessibility | Reduced motion support |

### Keputusan Teknis

- Gunakan satu WebGL canvas untuk karakter
- Hindari React state update pada setiap frame
- Gunakan `frameloop="demand"` saat karakter idle; aktifkan rendering saat diperlukan
- Gunakan texture dan model yang dioptimalkan
- Nonaktifkan efek visual mahal pada perangkat lemah
- Jangan gunakan physics simulation penuh jika spring animation sudah cukup

> Testing dilakukan di PC GTX 1050 Ti, tetapi juga perlu pengujian di perangkat mobile dan browser lain.

---

## 9. Struktur Folder Project

```
juro/
├── public/
│   ├── models/
│   ├── textures/
│   └── sounds/
│
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── pet/
│   │
│   ├── features/
│   │   ├── character/
│   │   ├── virtual-pet/
│   │   ├── activities/
│   │   ├── inventory/
│   │   └── progression/
│   │
│   ├── engine/
│   │   ├── rendering/
│   │   ├── physics/
│   │   ├── animation/
│   │   └── behavior/
│   │
│   ├── stores/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── styles/
│
├── tests/
└── package.json
```

---

## 10. Strategi Menggunakan AI untuk Development

Gunakan AI sebagai **engineering partner**, bukan untuk membuat seluruh aplikasi dalam satu prompt.

| Pekerjaan | Cara Menggunakan AI |
|---|---|
| Architecture | Menganalisis dan merancang struktur |
| UI development | Membuat komponen per section |
| 3D development | Membuat shader dan behavior bertahap |
| Blender | Membantu modeling workflow dan script |
| Debugging | Menganalisis error dan profiling |
| Testing | Membuat unit dan integration tests |
| Refactoring | Memeriksa konsistensi arsitektur |

> Setiap fase harus punya acceptance criteria. Jangan lanjut jika karakter masih patah-patah atau sistem pet belum konsisten.

---

## 11. Scope MVP (Versi Pertama)

### Checklist

- [ ] White-orange responsive interface
- [ ] 3D Juro dengan material jelly
- [ ] Idle, bounce, squash & stretch
- [ ] Drag dan cursor interaction
- [ ] Wander behavior
- [ ] Hunger, energy, happiness
- [ ] Feed, play, dan sleep
- [ ] Mood dan expression system
- [ ] Local save menggunakan IndexedDB
- [ ] Performance optimization

**Disimpan untuk pengembangan berikutnya:** AI conversation, voice interaction, multiplayer, breeding/evolution kompleks.

---

## 12. Keputusan yang Dikunci

| Aspek | Keputusan |
|---|---|
| **Nama** | JURO |
| **Kategori** | 3D Virtual Pet Website |
| **Karakter** | Orange translucent jelly slime |
| **Visual** | Minimalist, playful, premium |
| **Warna** | White + Orange + Charcoal |
| **Frontend** | React + Vite + TypeScript |
| **3D** | Blender + Three.js + React Three Fiber |
| **Behavior** | Zustand + custom behavior engine |
| **Database** | IndexedDB + Supabase |
| **Prioritas** | Character experience + performance |
