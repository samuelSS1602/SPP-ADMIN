import os

script_path = 'd:/PROGRAM/LODGE ADMIN/script.js'
with open(script_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

receipt_js = []
booking_js = []
script_js = []

def in_range(idx, ranges):
    line_num = idx + 1
    for start, end in ranges:
        if start <= line_num <= end:
            return True
    return False

receipt_ranges = [(21, 21), (892, 1082)]
booking_ranges = [(23, 24), (26, 26), (162, 363), (1651, 1660), (1791, 2115)]

for i, line in enumerate(lines):
    if in_range(i, receipt_ranges):
        receipt_js.append(line)
    elif in_range(i, booking_ranges):
        booking_js.append(line)
    else:
        script_js.append(line)

with open('d:/PROGRAM/LODGE ADMIN/receipt.js', 'w', encoding='utf-8') as f:
    f.writelines(receipt_js)

with open('d:/PROGRAM/LODGE ADMIN/booking.js', 'w', encoding='utf-8') as f:
    f.writelines(booking_js)

with open(script_path, 'w', encoding='utf-8') as f:
    f.writelines(script_js)

html_path = 'd:/PROGRAM/LODGE ADMIN/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<script src="script.js"></script>', 
                    '<script src="receipt.js"></script>\n    <script src="booking.js"></script>\n    <script src="script.js"></script>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Refactoring complete.")
