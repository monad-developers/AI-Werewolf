# 🐺 Kerangka Permainan AI Werewolf (AI 狼人杀)

Sebuah kerangka permainan Werewolf berbasis AI untuk banyak pemain dengan arsitektur monorepo, mendukung beberapa pemain AI yang memiliki kepribadian unik.

## ✨ Fitur

- 🤖 **Didukung AI**: 6 pemain AI dengan kepribadian dan strategi berbeda
- 🎮 **Alur Permainan Lengkap**: Diskusi siang hari, pemungutan suara, dan keterampilan peran malam hari
- 🎭 **Sistem Peran**: Mendukung peran Penduduk Desa, Werewolf, Peramal, dan Penyihir
- 📊 **Antarmuka Visual**: Manajemen status real-time dengan React + MobX
- 🔍 **Telemetri AI**: Terintegrasi Langfuse untuk analisis perilaku AI
- 🚀 **Kinerja Tinggi**: Menggunakan runtime Bun tanpa langkah build

## 🛠 Teknologi yang Digunakan

- **Runtime**: Bun
- **Frontend**: Vite + React + MobX + TailwindCSS
- **Backend**: Express + TypeScript
- **AI**: OpenAI SDK + sistem kepribadian kustom
- **Monitoring**: Telemetri Langfuse
- **Arsitektur**: Monorepo (Bun Workspaces)

## 📦 Struktur Proyek

```
AI-Werewolf/
├── packages/
│   ├── game-master-vite/   # Frontend pengendali permainan
│   └── player/              # Server pemain AI
├── shared/
│   ├── types/               # Definisi tipe bersama
│   ├── lib/                 # Library utilitas bersama
│   └── prompts/             # Template prompt AI
├── config/                  # File konfigurasi pemain
└── scripts/                 # Skrip pemulaan
```

## 🚀 Memulai

### Prasyarat

- Node.js 18+
- Bun 1.0+
- Kunci API OpenAI

### Instalasi

```bash
# Klon repositori
git clone https://github.com/yourusername/AI-Werewolf.git
cd AI-Werewolf

# Pasang dependensi
bun install

# Konfigurasi variabel lingkungan
cp .env.example .env
# Edit file .env, tambahkan kunci API OpenAI Anda
```

### Memulai Permainan

```bash
# Mulai semua pemain AI (port 3001-3006)
bun run dev:players

# Di terminal baru, mulai antarmuka pengendali permainan (port 3000)
bun run dev:game-master
```

Kunjungi http://localhost:3000 untuk memulai permainan!

## 🎮 Alur Permainan

1. **Buat Permainan**: Klik tombol "Buat Permainan Baru"
2. **Tambahkan Pemain**: Sistem otomatis menambahkan 6 pemain AI
3. **Tetapkan Peran**: Pembagian acak peran Werewolf, Peramal, Penyihir, dan Penduduk Desa
4. **Siklus Permainan**:
   - 🌞 Siang Hari: Pemain berdiskusi dan memilih untuk mengusir
   - 🌙 Malam Hari: Peran spesial menggunakan keterampilan
5. **Kondisi Kemenangan**:
   - Faksi Penduduk Desa: Eliminasi semua Werewolf
   - Faksi Werewolf: Jumlah Werewolf ≥ jumlah Penduduk Desa

## 🤖 Konfigurasi Pemain AI

Setiap pemain AI memiliki pengaturan kepribadian unik:

| Port | Pemain | Tipe Strategi | Gaya Bicara | Karakteristik |
|------|--------|---------------|-------------|---------------|
| 3001 | Pemain1 | Seimbang      | Kasual      | Analitis rasional |
| 3002 | Pemain2 | Agresif       | Formal      | Tipe penyerang |
| 3003 | Pemain3 | Konservatif   | Formal      | Tipe hati-hati |
| 3004 | Pemain4 | Seimbang      | Jenaka      | Humoris |
| 3005 | Pemain5 | Seimbang      | Formal      | Penalaran logis |
| 3006 | Pemain6 | Konservatif   | Kasual      | Pemula hati-hati |

## 🔧 Perintah Pengembangan

### Mode Pengembangan

```bash
# Mulai semua pemain AI
bun run dev:players

# Mulai pengendali permainan
bun run dev:game-master

# Mulai pemain dengan kepribadian spesifik
bun run dev:player:aggressive
bun run dev:player:conservative
bun run dev:player:witty
```

### Kualitas Kode

```bash
# Pemeriksaan tipe
bun run typecheck

# Pemeriksaan standar kode
bun run lint

# Jalankan pengujian
bun test

# Cakupan pengujian
bun run test:coverage
```

## 📊 Monitoring & Log

### Status Pemain AI

Setiap pemain AI menyediakan antarmuka status:

- http://localhost:3001/api/player/status
- http://localhost:3002/api/player/status
- ... (3003-3006)

### File Log

Log mode pengembangan disimpan di direktori `logs/`:

- `player1-dev.log` - Log Pemain1
- `player2-dev.log` - Log Pemain2
- ... (pemain3-6)
- `game-master-dev.log` - Log pengendali permainan

## 🎯 Fitur Inti

### Sistem Peran

- **Penduduk Desa** 👤: Memilih di siang hari, tanpa keterampilan khusus
- **Werewolf** 🐺: Membunuh di malam hari, mengetahui identitas rekan
- **Peramal** 🔮: Memeriksa identitas satu pemain setiap malam
- **Penyihir** 🧪: Memiliki satu ramuan penawar dan satu racun

### Tahap Permainan

- **Tahap Persiapan**: Menunggu pemain bergabung
- **Tahap Malam**: Aksi peran spesial
- **Diskusi Siang Hari**: Pemain AI berbicara bebas
- **Tahap Pemungutan Suara**: Memilih untuk mengusir pemain mencurigakan
- **Akhir Permainan**: Mengevaluasi kondisi kemenangan

### Sistem Keputusan AI
- Rekayasa prompt kepribadian
- Pengambilan keputusan sadar konteks
- Logika pemungutan suara strategis

## ⏳ Fitur yang Akan Datang
- [ ] Penilaian AI saat permainan berakhir
- [ ] Kata perpisahan pemain yang dieliminasi
- [ ] Fungsi komunikasi tim Werewolf di malam hari
- [ ] Penambahan peran Penjaga, Pemburu, dll.
- [ ] Mode permainan 9 pemain
- [ ] Peningkatan UI/UX

## 🤝 Berkontribusi

Kontribusi melalui Pull Request atau Issue sangat diterima!
