import re

# 1. Update index.html
html_path = 'd:/PROGRAM/LODGE ADMIN/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Montserrat:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap'
)
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update styles.css
css_path = 'd:/PROGRAM/LODGE ADMIN/styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace Root
root_old_rgx = r':root\s*\{[^}]+\}'
root_new = """:root {
    --primary-brand: #4F46E5;
    --secondary-brand: #4338CA;
    --accent-brand: #8B5CF6;
    --light-bg: #F8FAFC;
    --card-bg: rgba(255, 255, 255, 0.95);
    --surface-muted: #F1F5F9;
    --border-light: #E2E8F0;
    --text-dark: #0F172A;
    --text-light: #64748B;
    --success: #10B981;
    --warning: #F59E0B;
    --danger: #EF4444;
    --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04);
    --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04);
    --radius-md: 8px;
    --radius-lg: 16px;
    --glass-border: rgba(255, 255, 255, 0.6);
    --primary-gold: #F59E0B;
}"""
css = re.sub(root_old_rgx, root_new, css, count=1)

# Fonts
css = css.replace("'Montserrat', sans-serif", "'Inter', sans-serif")
css = css.replace("'Playfair Display', serif", "'Plus Jakarta Sans', sans-serif")

# Body Background
body_rgx = r'body\s*\{[^}]*\}'
body_new = """body {
    font-family: 'Inter', sans-serif;
    background: radial-gradient(circle at top left, #EEF2FF 0%, #F8FAFC 40%, #F8FAFC 100%);
    color: var(--text-dark);
    line-height: 1.6;
}"""
css = re.sub(body_rgx, body_new, css, count=1)

# Login Container Background
css = css.replace('linear-gradient(135deg, var(--primary-teal) 0%, var(--secondary-teal) 100%)', 'radial-gradient(circle at center, #EEF2FF 0%, #E0E7FF 100%)')
# Actually, the old file was refactored to use var(--primary-brand). Let's catch both.
css = css.replace('linear-gradient(135deg, var(--primary-brand) 0%, var(--secondary-brand) 100%)', 'radial-gradient(circle at center, #EEF2FF 0%, #E0E7FF 100%)')

# Sidebar
sidebar_old_rgx = r'\.sidebar\s*\{.*?(?:width:\s*260px;).*?\}'
sidebar_new = """.sidebar {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border-right: 1px solid var(--border-light);
    color: var(--text-dark);
    padding: 30px 20px;
    position: fixed;
    left: 0;
    top: 0;
    width: 260px;
    height: 100vh;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: var(--shadow-sm);
}"""
css = re.sub(sidebar_old_rgx, sidebar_new, css, count=1, flags=re.MULTILINE|re.DOTALL)

# Sidebar Header Border
css = css.replace('border-bottom: 1px solid rgba(212, 175, 55, 0.3);', 'border-bottom: 1px solid var(--border-light);')

# Sidebar text and items
css = css.replace('color: rgba(255, 255, 255, 0.8);', 'color: var(--text-light);')

nav_hover_rgx = r'\.nav-item:hover\s*\{[^}]*\}'
nav_hover_new = """.nav-item:hover {
    background-color: #EEF2FF;
    color: var(--primary-brand);
    transform: translateX(2px);
}"""
css = re.sub(nav_hover_rgx, nav_hover_new, css, count=1)

nav_active_rgx = r'\.nav-item\.active\s*\{[^}]*\}'
nav_active_new = """.nav-item.active {
    background: #E0E7FF;
    color: var(--primary-brand);
    font-weight: 600;
    box-shadow: inset 3px 0 0 var(--primary-brand);
}"""
css = re.sub(nav_active_rgx, nav_active_new, css, count=1)

# Card styles
card_new = """.card {
    background: var(--card-bg);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-lg);
    padding: 25px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--glass-border);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}"""
css = re.sub(r'\.card\s*\{[^}]*transition[^}]*\}\s*\.card:hover\s*\{[^}]*\}', card_new, css, count=1)


metric_new = """.metric-card {
    background: var(--card-bg);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-lg);
    padding: 25px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--glass-border);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.metric-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}"""
css = re.sub(r'\.metric-card\s*\{[^}]*transition[^}]*\}\s*\.metric-card:hover\s*\{[^}]*\}', metric_new, css, count=1)


# Buttons
btn_login_rgx = r'\.btn-login\s*\{[^}]*\}'
btn_login_new = """.btn-login {
    padding: 14px;
    background: linear-gradient(135deg, var(--primary-brand) 0%, var(--accent-brand) 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    margin-top: 10px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}"""
css = re.sub(btn_login_rgx, btn_login_new, css, count=1)

# Replace all standard buttons to cool ones
css = css.replace('.btn-primary {', '.btn-primary {\n    background: linear-gradient(135deg, var(--primary-brand) 0%, var(--accent-brand) 100%);\n    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);\n    border: none;')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("Option 2 Premium Light Mode Applied.")
