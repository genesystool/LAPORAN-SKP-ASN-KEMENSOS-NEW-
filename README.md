# Laporan SKP Online - Develop By Genesystool

Aplikasi Sistem Laporan Kinerja ASN & SKP Online berbasis React + Vite + Express & Firebase.

---

## 🚀 Cara Export & Hubungkan dari AI Studio ke GitHub

Anda dapat mengekspor atau menghubungkan proyek ini langsung dari AI Studio:
1. Klik **Menu Titik Tiga (`...`)** atau **Settings** di pojok kanan atas layar AI Studio.
2. Pilih **Export** atau **Connect to GitHub**.
3. Pilih/Login ke akun GitHub Anda dan tentukan nama repositori target.
4. Klik **Push / Export** untuk mengunggah seluruh kode aplikasi secara otomatis.

---

## 💻 Cara Meng-update Repositori di GitHub Menggunakan CMD / Terminal (Lokal)

Jika Anda mendownload kode proyek ini atau mengerjakannya di komputer lokal, ikuti langkah-langkah berikut di Command Prompt (CMD) atau Terminal:

### 1. Inisialisasi Git & Hubungkan ke Repositori (Pertama Kali)
```cmd
git init
git add .
git commit -m "Initial commit - Laporan SKP Online"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
git push -u origin main
```

### 2. Cara Meng-update / Upload Pembaruan Kode Selanjutnya
Setiap kali ada perubahan file di komputer Anda dan ingin diunggah ke GitHub:

```cmd
:: 1. Cek status file yang diubah
git status

:: 2. Tambahkan semua perubahan file
git add .

:: 3. Buat catatan commit perubahan
git commit -m "Update fitur dan perbaikan script Laporan SKP"

:: 4. Unggah perubahan ke GitHub
git push origin main
```

---

## 🛠️ Cara Menjalankan Aplikasi di Komputer Lokal

1. **Install Dependensi:**
   ```cmd
   npm install
   ```

2. **Jalankan Mode Pengembangan (Dev Server):**
   ```cmd
   npm run dev
   ```
   Akses aplikasi di browser melalui `http://localhost:3000`.

3. **Build untuk Produksi:**
   ```cmd
   npm run build
   npm start
   ```
