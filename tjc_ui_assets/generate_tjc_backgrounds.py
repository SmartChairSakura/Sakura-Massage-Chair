import os
from PIL import Image, ImageDraw, ImageFont

out_dir = r"C:\Users\user\Documents\Antigravity\Kursi Pijat\tjc_ui_assets"
os.makedirs(out_dir, exist_ok=True)

WIDTH, HEIGHT = 480, 800

# Fonts
font_title = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 26)
font_subtitle = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)
font_tag = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 11)
font_footer = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 13)
font_card_title = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 22)
font_card_desc = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 13)
font_btn = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 18)

# Card Fonts (Besar & Jelas)
font_card_time = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 25)
font_card_price = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 21)

def draw_header(draw, title, subtitle):
    # Top bar background
    draw.rectangle([0, 0, WIDTH, 95], fill="#111827")
    draw.line([0, 95, WIDTH, 95], fill="#1f2937", width=2)
    
    # Sakura icon/dot
    draw.ellipse([22, 28, 46, 52], fill="#f43f5e")
    draw.ellipse([28, 34, 40, 46], fill="#fda4af")
    
    # Title & Subtitle
    draw.text((56, 22), title, font=font_title, fill="#ffffff")
    draw.text((56, 56), subtitle, font=font_subtitle, fill="#9ca3af")
    
    # Online badge
    draw.rounded_rectangle([360, 30, 456, 60], radius=15, fill="#064e3b", outline="#059669", width=1)
    draw.ellipse([372, 41, 380, 49], fill="#10b981")
    draw.text((388, 37), "ONLINE", font=font_tag, fill="#34d399")

# ==========================================
# PAGE 0: GRID 2x4 (8 PAKET DURASI & HARGA)
# ==========================================
im0 = Image.new("RGB", (WIDTH, HEIGHT), "#0b0f19")
d0 = ImageDraw.Draw(im0)
draw_header(d0, "SAKURA ZEN", "Pilih Durasi Pijat Relaksasi")

packages_grid = [
    {"code": "P1", "time": "4 Menit",  "price": "Rp 5.000",  "color": "#38bdf8"},
    {"code": "P2", "time": "8 Menit",  "price": "Rp 10.000", "color": "#38bdf8"},
    {"code": "P3", "time": "12 Menit", "price": "Rp 15.000", "color": "#818cf8"},
    {"code": "P4", "time": "16 Menit", "price": "Rp 20.000", "color": "#f43f5e", "best": True},
    {"code": "P5", "time": "20 Menit", "price": "Rp 25.000", "color": "#818cf8"},
    {"code": "P6", "time": "24 Menit", "price": "Rp 30.000", "color": "#fbbf24"},
    {"code": "P7", "time": "28 Menit", "price": "Rp 35.000", "color": "#fbbf24"},
    {"code": "P8", "time": "32 Menit", "price": "Rp 40.000", "color": "#fb923c"},
]

col_w = 210
row_h = 130
gap_x = 20
gap_y = 14
start_x = 20
start_y = 115

for idx, pkg in enumerate(packages_grid):
    row = idx // 2
    col = idx % 2
    
    x1 = start_x + col * (col_w + gap_x)
    y1 = start_y + row * (row_h + gap_y)
    x2 = x1 + col_w
    y2 = y1 + row_h
    
    is_best = pkg.get("best", False)
    
    bg_box = "#182033" if not is_best else "#271424"
    border_box = "#334155" if not is_best else "#f43f5e"
    border_w = 2 if is_best else 1
    
    d0.rounded_rectangle([x1, y1, x2, y2], radius=14, fill=bg_box, outline=border_box, width=border_w)
    
    if is_best:
        d0.rounded_rectangle([x2 - 82, y1 + 8, x2 - 8, y1 + 24], radius=6, fill="#881337")
        d0.text((x2 - 45, y1 + 16), "FAVORIT", font=font_tag, fill="#f43f5e", anchor="mm")
    
    cx = (x1 + x2) // 2
    d0.text((cx, y1 + 42), pkg["time"], font=font_card_time, fill="#ffffff", anchor="mm")
    d0.line([x1 + 30, y1 + 68, x2 - 30, y1 + 68], fill="#334155" if not is_best else "#4c1d30", width=1)
    d0.text((cx, y1 + 96), pkg["price"], font=font_card_price, fill=pkg["color"], anchor="mm")

d0.rounded_rectangle([20, 705, 460, 775], radius=12, fill="#111827", outline="#1f2937", width=1)
d0.text((240, 726), "Sentuh salah satu paket untuk bayar via QRIS", font=font_footer, fill="#cbd5e1", anchor="mm")
d0.text((240, 752), "BCA • Mandiri • GoPay • OVO • Dana • ShopeePay", font=font_tag, fill="#64748b", anchor="mm")

im0.save(os.path.join(out_dir, "page0_standby_480x800.png"))
print("Generated page0_standby_480x800.png")

# ==========================================
# PAGE 1: PEMBAYARAN QRIS (KOTAK BERSIH UNTUK qr0)
# ==========================================
im1 = Image.new("RGB", (WIDTH, HEIGHT), "#0b0f19")
d1 = ImageDraw.Draw(im1)
draw_header(d1, "PEMBAYARAN QRIS", "Scan Kode QR dengan Bank / E-Wallet")

# White QR Container (Center) - Bersih Polos untuk qr0
qr_box_y = 150
d1.rounded_rectangle([65, qr_box_y, 415, qr_box_y + 350], radius=18, fill="#ffffff", outline="#f43f5e", width=2)
d1.text((240, qr_box_y + 25), "QRIS DINAMIS MIDTRANS", font=font_tag, fill="#1e293b", anchor="mm")

# Instruction Text
d1.text((240, 525), "BCA • Mandiri • BRI • BNI • GoPay • OVO • DANA • ShopeePay", font=font_tag, fill="#9ca3af", anchor="mm")
d1.text((240, 555), "SISA WAKTU PEMBAYARAN", font=font_tag, fill="#cbd5e1", anchor="mm")

# Sleek Container Box untuk Komponen Teks t_qtimer (Kosong & bersih untuk t_qtimer)
d1.rounded_rectangle([150, 575, 330, 628], radius=12, fill="#111827", outline="#334155", width=1)

d1.text((240, 650), "Kursi otomatis aktif setelah transaksi berhasil", font=font_footer, fill="#10b981", anchor="mm")

# Cancel Button at Bottom
d1.rounded_rectangle([60, 680, 420, 745], radius=14, fill="#1e1e24", outline="#dc2626", width=2)
d1.text((240, 712), "BATALKAN TRANSAKSI", font=font_btn, fill="#ef4444", anchor="mm")

im1.save(os.path.join(out_dir, "page1_qris_480x800.png"))
print("Generated clean page1_qris_480x800.png")

# ==========================================
# PAGE 2: SESI PIJAT BERLANGSUNG (PROGRESS BAR DIHAPUS, LAYOUT BERSIH & LEGA)
# ==========================================
im2 = Image.new("RGB", (WIDTH, HEIGHT), "#0b0f19")
d2 = ImageDraw.Draw(im2)
draw_header(d2, "KURSI SEDANG AKTIF", "Selamat Menikmati Pijatan Relaksasi")

# Success checkmark circle
cx, cy, r = 240, 180, 42
d2.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#064e3b", outline="#10b981", width=3)
d2.line([(cx - 17, cy), (cx - 5, cy + 13)], fill="#34d399", width=5)
d2.line([(cx - 5, cy + 13), (cx + 19, cy - 14)], fill="#34d399", width=5)

d2.text((240, 245), "PEMBAYARAN TERVERIFIKASI", font=font_tag, fill="#34d399", anchor="mm")
d2.text((240, 280), "SISA WAKTU PIJAT", font=font_card_title, fill="#ffffff", anchor="mm")

# Big Timer Display Box - KOSONG, BERSIH, LEGA (TANPA OVERLAP)
d2.rounded_rectangle([45, 315, 435, 475], radius=20, fill="#111827", outline="#1f2937", width=2)

# Comfort Tip Box
d2.rounded_rectangle([40, 520, 440, 630], radius=14, fill="#161d2f", outline="#2563eb", width=1)
d2.text((240, 550), "Panduan Kenyamanan:", font=font_card_desc, fill="#60a5fa", anchor="mm")
d2.text((240, 580), "Sandarkan kepala dan relakskan tubuh Anda.", font=font_card_desc, fill="#cbd5e1", anchor="mm")
d2.text((240, 605), "Kursi akan kembali tegak otomatis saat waktu habis.", font=font_card_desc, fill="#9ca3af", anchor="mm")

# Clean Zen Footer (Tanpa Tombol Stop Darurat)
d2.rounded_rectangle([40, 675, 440, 750], radius=14, fill="#111827", outline="#1f2937", width=1)
d2.text((240, 702), "Sistem Pijat Otomatis Tokuyo", font=font_footer, fill="#cbd5e1", anchor="mm")
d2.text((240, 726), "Kursi akan kembali ke posisi awal secara otomatis saat waktu selesai", font=font_tag, fill="#64748b", anchor="mm")

im2.save(os.path.join(out_dir, "page2_active_480x800.png"))
print("Generated page2_active_480x800.png without emergency stop button")
