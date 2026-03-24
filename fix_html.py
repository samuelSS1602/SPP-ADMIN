import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Overlay and ID
html = html.replace('<aside class="sidebar">', '<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileMenu()"></div>\\n        <aside class="sidebar" id="sidebar">')

# 2. Hamburger menu
old_header = """<div class="header-left">
                    <h2 id="pageTitle">Dashboard</h2>
                    <small id="liveDateTime" style="color: var(--text-light); font-weight: 600;"></small>
                </div>"""
new_header = """<div class="header-left" style="display: flex; align-items: center; gap: 15px;">
                    <button class="mobile-menu-btn" onclick="toggleMobileMenu()" style="display: none; background: none; border: none; font-size: 20px; color: var(--primary-brand); cursor: pointer;">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div>
                        <h2 id="pageTitle">Dashboard</h2>
                        <small id="liveDateTime" style="color: var(--text-light); font-weight: 600;"></small>
                    </div>
                </div>"""
html = html.replace(old_header, new_header)

# 3. Tables - non greedily wrap them exactly
# <table class="data-table"> ... </table>
html = re.sub(r'(<table class="data-table">.*?</table>)', r'<div class="table-responsive">\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\1\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t</div>', html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
