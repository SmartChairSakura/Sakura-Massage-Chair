import struct
import sys
import os
import shutil

sys.path.append('TFTTool')
from NextionChecksum import Checksum

def patch_tft(src_path: str, dst_path: str, model_str: str, vendor_char: str = 'T'):
    print(f"=== Patching for Model: '{model_str}', Vendor: '{vendor_char}' ===")
    with open(src_path, 'rb') as f:
        data = bytearray(f.read())

    cs = Checksum()

    # 1. Auto-clean dummy QRIS text to empty
    idx_qr = data.find(b'http://tjc1688.com')
    if idx_qr != -1:
        data[idx_qr:idx_qr + len(b'http://tjc1688.com')] = b'\x00' * len(b'http://tjc1688.com')
        print("   -> Cleared default QRIS dummy text to empty")

    # 2. Set default timer text to 'HARAP TUNGGU'
    for pattern in [b'00:00', b'08:00', b'15:59']:
        idx_timer = data.find(pattern)
        if idx_timer != -1:
            data[idx_timer:idx_timer + 16] = b'HARAP TUNGGU\x00\x00\x00\x00'
            print("   -> Set default timer text to 'HARAP TUNGGU'")
            break

    # 3. Disable Emergency Stop button touch script
    idx_stop = data.find(b'STOP')
    if idx_stop != -1 and idx_stop > 0x0A0000:
        data[idx_stop - 3 : idx_stop + 15] = b'\x00' * 18
        print("   -> Disabled Emergency Stop button touch action")

    # 1. Vendor at offset 3
    data[3] = ord(vendor_char)
    print(f"1. Set Vendor (offset 0x03) = 0x{data[3]:02X} ('{vendor_char}')")

    # 2. Model CRC at offset 46 (0x2E)
    model_bytes = model_str.encode('ascii')
    model_crc = cs.CRC(data=model_bytes)
    struct.pack_into('<I', data, 0x2e, model_crc)
    print(f"2. Set Model CRC (offset 0x2E) = 0x{model_crc:08X} for '{model_str}'")

    # 3. Recalculate Header 1 CRC (bytes 0..0xC4)
    h1_crc = cs.CRC(data=bytes(data[:0xc4]))
    struct.pack_into('<I', data, 0xc4, h1_crc)
    print(f"3. Recalculated Header 1 CRC (offset 0xC4) = 0x{h1_crc:08X}")

    # 4. Recalculate Whole File Checksum (all bytes except last 4)
    # Series 3 uses 32-bit word CRC
    body = bytes(data[:-4])
    words_count = len(body) // 4
    missing = len(body) - words_count * 4
    word_list = list(struct.unpack(f'<{words_count}I', body + b'\x00' * missing))
    file_crc = cs.CRC(data=word_list)
    file_crc ^= data[0x03] ^ data[0x2e] ^ data[0x3c]
    struct.pack_into('<I', data, len(data) - 4, file_crc)
    print(f"4. Recalculated Whole File CRC (end of file) = 0x{file_crc:08X}")

    with open(dst_path, 'wb') as f:
        f.write(data)
    print(f"Saved: {dst_path} ({len(data)} bytes)\n")

if __name__ == '__main__':
    # Determine the newest compiled TFT file
    candidates = ['Sakura_TJC.tft', 'Sakura_Kursi_Pijat.tft']
    existing = [f for f in candidates if os.path.exists(f)]
    if not existing:
        print("ERROR: No TFT source file found!")
        sys.exit(1)
    
    # Pick the newest one
    src = max(existing, key=os.path.getmtime)
    print(f"Selected newest TFT source: '{src}' ({os.path.getsize(src)} bytes, modified: {os.path.getmtime(src)})")

    # Generate variant 1: exact string shown on error screen
    patch_tft(src, 'Sakura_Kursi_Pijat_TJC_011C.tft', 'TJC4880X243_011C', 'T')
    # Generate variant 2: standard _011 ending
    patch_tft(src, 'Sakura_Kursi_Pijat_TJC_011.tft', 'TJC4880X243_011', 'T')
    # Generate variant 3: 8048 resolution permutation if needed
    patch_tft(src, 'Sakura_Kursi_Pijat_TJC_8048_011C.tft', 'TJC8048X243_011C', 'T')
    patch_tft(src, 'Sakura_Kursi_Pijat_TJC_8048_011.tft', 'TJC8048X243_011', 'T')
    
    # Primary file matching the physical hardware is _011 (without C)
    shutil.copyfile('Sakura_Kursi_Pijat_TJC_011.tft', 'Sakura_Kursi_Pijat_TJC.tft')
    print("ALL TJC TFT VARIANTS GENERATED SUCCESSFULLY!")
