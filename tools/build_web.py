"""Bungkus game menjadi zip siap unggah ke itch.io (HTML5 / WebGL).

Pakai:  python tools/build_web.py
Hasil:  dist/eyes-for-the-nameless-web.zip  (index.html berada di akar zip)

Hanya file yang dipakai game yang dimasukkan (daftar putih), jadi file kerja
seperti .git, .claude, serve.py, tools/, dan tekstur cadangan tidak ikut.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'dist')
OUT = os.path.join(OUT_DIR, 'eyes-for-the-nameless-web.zip')

FILES = [
    'index.html', 'style.css', 'readme.md',
    'MainKnightRig.glb',
]
DIRS = ['js', 'assets']
SKIP = {
    'assets/paperlagi.jpg', 'assets/papersalah.jpg',  # tekstur lama, tidak dipakai
}


def collect():
    paths = []
    for f in FILES:
        paths.append(f)
    for d in DIRS:
        for base, _, names in os.walk(os.path.join(ROOT, d)):
            for n in names:
                rel = os.path.relpath(os.path.join(base, n), ROOT).replace(os.sep, '/')
                if rel not in SKIP and not (d == 'assets' and n.lower().endswith('.md')):
                    paths.append(rel)
    missing = [p for p in paths if not os.path.isfile(os.path.join(ROOT, p))]
    if missing:
        sys.exit('File hilang: ' + ', '.join(missing))
    return sorted(paths)


def main():
    paths = collect()
    os.makedirs(OUT_DIR, exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in paths:
            z.write(os.path.join(ROOT, p), p)
    total = sum(os.path.getsize(os.path.join(ROOT, p)) for p in paths)
    print(f'{len(paths)} file, {total / 1e6:.1f} MB sebelum kompresi')
    print(f'-> {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) / 1e6:.1f} MB)')
    print('Unggah ke itch.io: Kind of project = HTML, centang "This file will be played in the browser".')


if __name__ == '__main__':
    main()
