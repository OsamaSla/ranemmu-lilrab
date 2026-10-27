import os, sys, zipfile

path = sys.argv[1]
z = zipfile.ZipFile(path)
items = {name: z.read(name) for name in z.namelist()}
z.close()

wb_xml = items['xl/workbook.xml'].decode('utf-8')
if 'fullCalcOnLoad' not in wb_xml:
    if '<calcPr' in wb_xml:
        import re
        wb_xml = re.sub(r'<calcPr[^>]*/>', '<calcPr calcId="124519" fullCalcOnLoad="1"/>', wb_xml, count=1)
    else:
        wb_xml = wb_xml.replace('</workbook>', '<calcPr calcId="124519" fullCalcOnLoad="1"/></workbook>', 1)
items['xl/workbook.xml'] = wb_xml.encode('utf-8')

tmp = path + '.tmp'
zo = zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED)
for name, data in items.items():
    zo.writestr(name, data)
zo.close()
os.replace(tmp, path)
print('patched fullCalcOnLoad')