#!/usr/bin/env python3
"""The AI render is anti-aliased and its olive background nearly matches the
grass, so colour keying fails. Instead segment by TEXTURE: the background is
smooth (low gradient) while every sprite is busy (outlines, rock, speckle).
Build a silhouette from the gradient magnitude, fill it, split into pieces."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = 'assets/raw/relief_src.png'
OUT = 'assets/raw'
EDGE_THR = 26
MIN_AREA = 1500

im = Image.open(SRC).convert('RGBA')
arr = np.asarray(im).copy()
gray = arr[:, :, :3].mean(axis=2)

gx = ndimage.sobel(gray, axis=0)
gy = ndimage.sobel(gray, axis=1)
mag = np.hypot(gx, gy)

mask = mag > EDGE_THR
mask = ndimage.binary_dilation(mask, iterations=4)
mask = ndimage.binary_fill_holes(mask)
mask = ndimage.binary_erosion(mask, iterations=3)
mask = ndimage.binary_dilation(mask, iterations=1)

arr[:, :, 3] = np.where(mask, 255, 0).astype(np.uint8)
Image.fromarray(arr).save(f'{OUT}/relief_nobg.png')

lbl, n = ndimage.label(mask, structure=np.ones((3, 3)))
boxes = []
for i in range(1, n + 1):
    ys, xs = np.where(lbl == i)
    if len(xs) < MIN_AREA:
        continue
    boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, len(xs)))
boxes.sort(key=lambda b: (round(b[1] / 60), b[0]))

print(f'image {im.width}x{im.height}  pieces: {len(boxes)}')
cols = 6
cw = max(b[2] - b[0] for b in boxes) + 16
ch = max(b[3] - b[1] for b in boxes) + 26
rows = (len(boxes) + cols - 1) // cols
sheet = Image.new('RGBA', (cw * cols, ch * rows), (35, 35, 40, 255))
d = ImageDraw.Draw(sheet)
for idx, (x0, y0, x1, y1, area) in enumerate(boxes):
    crop = Image.fromarray(arr[y0:y1, x0:x1])
    crop.save(f'{OUT}/piece_{idx:02d}.png')
    print(f'{idx:02d}: {x1-x0}x{y1-y0} area={area} at ({x0},{y0})')
    gx0, gy0 = (idx % cols) * cw, (idx // cols) * ch
    sheet.paste(crop, (gx0 + 8, gy0 + 20), crop)
    d.text((gx0 + 8, gy0 + 5), f'#{idx}', fill=(255, 220, 0, 255))
sheet.save(f'{OUT}/_contact_sheet.png')
print('wrote contact sheet')
