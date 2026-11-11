#!/usr/bin/env python3
"""Generate minimal placeholder PNG icons for PolicyLens extension."""
import struct
import zlib
import os


def make_png(size: int, r: int, g: int, b: int) -> bytes:
    """Return bytes of a solid-color PNG at the given square size."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xFFFFFFFF)

    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw_rows = b''.join(b'\x00' + bytes([r, g, b]) * size for _ in range(size))
    idat = chunk(b'IDAT', zlib.compress(raw_rows))
    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


if __name__ == '__main__':
    icon_dir = os.path.join(os.path.dirname(__file__), 'extension', 'icons')
    os.makedirs(icon_dir, exist_ok=True)
    for size, name in [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]:
        path = os.path.join(icon_dir, name)
        with open(path, 'wb') as fh:
            fh.write(make_png(size, 99, 102, 241))
        print(f'Created {path}')
    print('Done.')
