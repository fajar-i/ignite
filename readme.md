Tidak perlu instal apa pun. Game ini cuma file HTML/JS biasa, dan Three.js dimuat dari internet. Yang dibutuhkan hanya **Python** (sudah ada di laptop kamu) dan koneksi internet.

**Jalankan game:**
```powershell
cd C:\kuliah\semester_7\ignite
```
```powershell
python serve.py
```
Lalu buka alamat yang muncul di terminal, biasanya http://localhost:5173. Kalau port itu sedang dipakai, server otomatis pindah ke 5174, 5175, dan seterusnya. Gunakan alamat yang tercetak di terminal.

**Berhenti:** tekan `Ctrl+C` di terminal.

**Cek level masih bisa diselesaikan** (opsional, butuh Node.js, sudah terpasang):
```powershell
node tools/validate.mjs
```

Membuka `index.html` dengan klik dua kali tidak akan jalan: browser memblokir file `.js` dan `.fbx` kalau dibuka langsung tanpa server. Jadi selalu jalankan lewat `serve.py`.