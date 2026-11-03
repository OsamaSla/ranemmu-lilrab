import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('all_index_ocr.txt', 'r', encoding='utf8') as f:
    text = f.read()

for line in text.split('\n'):
    for target in range(371, 386):
        t_str = str(target)
        t_ar = ''.join('٠١٢٣٤٥٦٧٨٩'[int(c)] for c in t_str)
        if t_str in line or t_ar in line:
            print(f'[{target}] {line.strip()}')

