#!/usr/bin/env python3
import struct, zlib, os

def make_png(size, r, g, b):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xFFFFFFFF)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw_rows = b''.join(b'\x00' + bytes([r, g, b]) * size for _ in range(size))
    idat = chunk(b'IDAT', zlib.compress(raw_rows))
    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend

icon_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extension', 'icons')
os.makedirs(icon_dir, exist_ok=True)
for size, name in [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]:
    path = os.path.join(icon_dir, name)
    with open(path, 'wb') as f:
        f.write(make_png(size, 99, 102, 241))
    print(f'Created {path} ({os.path.getsize(path)} bytes)')
print('Icons done.')
