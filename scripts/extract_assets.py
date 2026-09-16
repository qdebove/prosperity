"""Extract the supplied rulebook's printed artwork, without external assets.

Run with: python scripts/extract_assets.py
Requires PyMuPDF (or the project-local .tools installation).
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
import pymupdf

doc = pymupdf.open(ROOT / 'bb-prosperity-rulebook.pdf')
out = ROOT / '.artifacts'
out.mkdir(exist_ok=True)
for number in (0, 2, 6, 7):
    page = doc[number]
    page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(out / f'page-{number + 1}.jpg')
    print(number + 1, page.rect)

assets = ROOT / 'public' / 'assets'
assets.mkdir(parents=True, exist_ok=True)

def crop(page, name, rect, zoom=4):
    doc[page].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(rect)).save(assets / f'{name}.jpg')
    if name.startswith(('initial-', 'start-')) or name[:4].isdigit():
        x, y, right, bottom = rect
        width, height = right - x, bottom - y
        illustration = (x + width * .27, y + height * .20, x + width * .73, y + height * .77)
        doc[page].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(illustration)).save(assets / f'art-{name}.jpg')

crop(0, 'city', (15, 162, 585, 354), 3)
crop(2, 'board-reference', (20, 542, 413, 823), 4)
crop(2, 'research-reference', (190, 137, 352, 536), 4)
for name, rect in [
    ('start-coal', (218, 549, 275, 606)),
    ('start-factory', (350, 549, 407, 606)),
    ('start-supply', (284, 617, 341, 674)),
    ('start-lab', (350, 617, 407, 674)),
    ('start-greenbelt', (218, 687, 275, 744)),
    ('start-road', (350, 687, 407, 744)),
]:
    crop(2, name, rect)

# Coordinates are the printed tile boundaries, in PDF points.
for row in range(6):
    for col in range(4):
        x = [94, 198, 303, 407][col]
        y = [33, 165, 297, 429, 561, 693][row]
        crop(6, f'initial-{row * 4 + col}', (x, y, x + 95, y + 95))

for row in range(7):
    columns = [43, 154, 263, 373, 483] if row < 6 else [43, 132, 220, 307, 395, 483]
    y = [37, 149, 261, 373, 485, 597, 709][row]
    for col, x in enumerate(columns):
        crop(7, f'{1970 + row * 10}-{col}', (x, y, x + 77, y + 77))
