"""The made-up camera for the camera demonstration: a six-well plate on a bench (camera-plate.jpg) and the same picture as the
short motion-JPEG that Chrome's fake camera plays (camera-plate.mjpeg). Nothing here is a real photograph.
Run again only to change it:  python scientia/demokit/assets/make-camera.py   (needs Pillow, numpy and ffmpeg)"""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 640, 480
r = np.random.default_rng(7)
bench = np.zeros((H, W, 3), np.float32) + np.array([58, 64, 70], np.float32)
bench += r.normal(0, 5, (H, W, 1)) + np.linspace(14, -10, H)[:, None, None]
img = Image.fromarray(np.clip(bench, 0, 255).astype(np.uint8)).convert('RGB')
d = ImageDraw.Draw(img, 'RGBA')
px0, py0, px1, py1 = 70, 90, 570, 390
d.rounded_rectangle((px0 + 8, py0 + 12, px1 + 8, py1 + 12), 26, fill=(0, 0, 0, 70))        # its shadow
d.rounded_rectangle((px0, py0, px1, py1), 26, fill=(226, 232, 236), outline=(190, 198, 204), width=3)
cols, rows, rad = 3, 2, 68
for j in range(rows):
    for i in range(cols):
        cx = px0 + 90 + i * 160; cy = py0 + 82 + j * 140
        d.ellipse((cx - rad - 5, cy - rad - 5, cx + rad + 5, cy + rad + 5), fill=(205, 212, 218))
        hue = (224, 108, 128) if (i + j * cols) != 4 else (232, 150, 98)                  # the medium; one well has gone orange
        d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=hue)
        d.ellipse((cx - rad + 10, cy - rad + 8, cx + rad - 26, cy + rad - 34), fill=(255, 255, 255, 38))   # a reflection
        for _ in range(60):                                                              # the gel's cell sheet, as specks
            a = r.uniform(0, 6.28); q = rad * 0.8 * np.sqrt(r.uniform())
            x, y = cx + q * np.cos(a), cy + q * np.sin(a)
            d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(150, 62, 88, 120))
d.rectangle((px0 + 20, py1 - 26, px0 + 210, py1 - 6), fill=(250, 250, 244))              # the sticker
try: f = ImageFont.truetype('arialbd.ttf', 15)
except Exception: f = ImageFont.load_default()
d.text((px0 + 28, py1 - 24), 'PLATE 4 · 30 kPa · run 4', fill=(20, 40, 70), font=f)
img = img.filter(ImageFilter.GaussianBlur(0.8))
img.save(os.path.join(HERE, 'camera-plate.jpg'), quality=88)
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', os.path.join(HERE, 'camera-plate.jpg'), '-t', '1', '-r', '5',
                '-vf', 'scale=640:480,format=yuvj420p', '-c:v', 'mjpeg', '-q:v', '5', os.path.join(HERE, 'camera-plate.mjpeg')], check=True)
