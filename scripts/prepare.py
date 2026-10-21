"""Retain alpha cutouts; support adaptive matting for future paper originals."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def prepare(path, name, band=False):
    a = np.array(Image.open(path).convert('RGBA'))
    method = 'existing-alpha'
    if a[:, :, 3].min() >= 250:
        rgb = a[:, :, :3].astype(float)
        border = np.concatenate([rgb[0], rgb[-1], rgb[1:-1, 0], rgb[1:-1, -1]])
        paper = np.median(border, axis=0)
        noise = np.linalg.norm(border - paper, axis=1)
        dead = max(4., float(np.median(noise) + 3 * np.median(abs(noise - np.median(noise)))))
        t = np.clip((np.linalg.norm(rgb - paper, axis=2) - dead) / 38, 0, 1)
        alpha = t * t * (3 - 2 * t)
        a[:, :, :3] = np.clip((rgb - paper * (1-alpha[:, :, None])) / np.maximum(alpha[:, :, None], .05), 0, 255)
        a[:, :, 3] = np.round(alpha * 255)
        method = 'border-median-ramp'
    alpha = a[:, :, 3]
    labels, count = ndimage.label(alpha > 8)
    sizes = np.bincount(labels.ravel())
    keep = sizes >= 4
    keep[0] = False
    alpha[~keep[labels]] = 0
    alpha[:] = ndimage.median_filter(alpha, size=3)
    y, x = np.nonzero(alpha > 8)
    if not len(x):
        raise ValueError(f'{name}: empty content')
    x0, x1 = max(0, int(x.min())-4), min(a.shape[1], int(x.max())+5)
    y0, y1 = (0, a.shape[0]) if band else (max(0, int(y.min())-4), min(a.shape[0], int(y.max())+5))
    crop = a[y0:y1, x0:x1]
    weight = crop[:, :, 3].astype(float)
    record = {'id': name, 'width': crop.shape[1], 'height': crop.shape[0],
              'centroidX': float((weight.sum(axis=0)*np.arange(crop.shape[1])).sum()/weight.sum()),
              'groundY': int(np.nonzero(weight > 8)[0].max()), 'method': method}
    target = ROOT / 'assets' / f'{name}.png'
    Image.fromarray(crop).save(target)
    (ROOT / 'assets' / f'{name}.json').write_text(json.dumps(record, indent=2))
    print(name, record['width'], record['height'], method)
    return record
