import re

css_path = 'd:/PROGRAM/LODGE ADMIN/styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update variables and hex codes globally
css = css.replace('--primary-teal', '--primary-brand')
css = css.replace('--secondary-teal', '--secondary-brand')
css = css.replace('--accent-teal', '--accent-brand')

# Replace the specific hardcoded teal hex codes with deep classic navy
css = re.sub(r'#1B4D3E', '#0B192C', css, flags=re.IGNORECASE)
css = re.sub(r'#2D7A6F', '#1F305E', css, flags=re.IGNORECASE)
css = re.sub(r'#4DB8A8', '#45629F', css, flags=re.IGNORECASE)

# Update root variables and shadows
root_old = """:root {
    --primary-gold: #D4AF37;
    --primary-brand: #0B192C;
    --secondary-brand: #1F305E;
    --accent-brand: #45629F;
    --light-bg: #F8F9FA;
    --card-bg: #FFFFFF;
    --surface-muted: #F4F6F8;
    --border-light: #E8E8E8;
    --text-dark: #2C3E50;
    --text-light: #7F8C8D;
    --success: #27AE60;
    --warning: #F39C12;
    --danger: #E74C3C;
    --shadow-sm: 0 4px 12px rgba(18, 35, 52, 0.06);
    --shadow-md: 0 10px 26px rgba(18, 35, 52, 0.1);
    --radius-md: 12px;
    --radius-lg: 16px;
}"""

root_new = """:root {
    --primary-gold: #C5A880;
    --primary-brand: #0B192C;
    --secondary-brand: #182848;
    --accent-brand: #4A628A;
    --light-bg: #F5F6F4;
    --card-bg: #FFFFFF;
    --surface-muted: #EAECEF;
    --border-light: #D5D9E0;
    --text-dark: #1e293b;
    --text-light: #64748b;
    --success: #27AE60;
    --warning: #F39C12;
    --danger: #E74C3C;
    --shadow-sm: 0 2px 4px rgba(11, 25, 44, 0.08);
    --shadow-md: 0 4px 12px rgba(11, 25, 44, 0.12);
    --shadow-lg: 0 12px 24px rgba(11, 25, 44, 0.15);
    --radius-md: 6px;
    --radius-lg: 10px;
}"""

if ":root {" in css:
    
    css = re.sub(r':root\s*\{[^}]+\}', root_new, css, count=1)

# Remove messy background gradients in body
body_old = r"""body\s*\{[^}]*background:[^}]+var\(--light-bg\);[^}]*\}"""
body_new = """body {
    font-family: 'Montserrat', sans-serif;
    background: var(--light-bg);
    color: var(--text-dark);
    line-height: 1.6;
}"""
if "radial-gradient" in css:
    css = re.sub(body_old, body_new, css, count=1, flags=re.MULTILINE | re.DOTALL)

# Update form inputs to be larger for real-time ease
input_old = r"""\.form-group input,\s*\.form-group select,\s*\.form-group textarea\s*\{[^}]*\}"""
input_new = """.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid var(--border-light);
    border-radius: var(--radius-md);
    font-size: 15px;
    font-family: inherit;
    transition: all 0.3s;
    background-color: var(--card-bg);
    color: var(--text-dark);
    font-weight: 500;
}"""
css = re.sub(input_old, input_new, css, count=1, flags=re.MULTILINE | re.DOTALL)


# Fix the sidebar background gradient to a solid classic color
sidebar_bg_rgx = r"""background:\s*linear-gradient\(180deg,\s*var\(--primary-brand\).*?\);"""
css = re.sub(sidebar_bg_rgx, "background: var(--primary-brand);", css)

# Make tables hoverable for ease of reading rows quickly
if "tbody tr:hover" not in css:
    table_hover = """\n.data-table tbody tr {
    transition: background-color 0.2s ease;
}
.data-table tbody tr:hover {
    background-color: var(--surface-muted);
}\n"""
    # Find table closing tag to append to it
    css = css.replace('.data-table tbody td {', table_hover + '.data-table tbody td {')


# Make receipt printing look pristine
css = css.replace('.receipt-topbar { height: 8px; background: linear-gradient(90deg, #1B4D3E, #D4AF37); }', 
                   '.receipt-topbar { height: 8px; background: linear-gradient(90deg, var(--primary-brand), var(--primary-gold)); }')
css = css.replace('.receipt-head h2 { margin: 0 0 4px 0; font-size: 22px; color: #1B4D3E; }', 
                   '.receipt-head h2 { margin: 0 0 4px 0; font-size: 22px; color: var(--primary-brand); }')

# Save updated CSS
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS Refactored successfully.")
