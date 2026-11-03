import fitz
import sys

# Let's inspect spread 138 and 139 in assets/1-401.pdf
doc = fitz.open('assets/1-401.pdf')
print('Total spreads in PDF:', len(doc))
# spreads are 0-indexed, so spread 138 is index 137, spread 139 is index 138
for s in [134, 135, 136, 137, 138]:
    page = doc[s]
    pix = page.get_pixmap(dpi=150)
    pix.save(f'spread_inspect_{s+1}.png')
    print(f'Saved spread_inspect_{s+1}.png')
