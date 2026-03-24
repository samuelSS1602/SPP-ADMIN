import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add overlay and id to sidebar
html = html.replace('<aside class="sidebar">', '<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileMenu()"></div>\n        <aside class="sidebar" id="sidebar">')

# Add hamburger button to header-left
old_header_left = '''<div class="header-left">
                    <h2 id="pageTitle">Dashboard</h2>
                    <small id="liveDateTime" style="color: var(--text-light); font-weight: 600;"></small>
                </div>'''
                
new_header_left = '''<div class="header-left" style="display: flex; align-items: center; gap: 15px;">
                    <button class="mobile-menu-btn" onclick="toggleMobileMenu()" style="display: none; background: none; border: none; font-size: 20px; color: var(--primary-brand); cursor: pointer;">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div>
                        <h2 id="pageTitle">Dashboard</h2>
                        <small id="liveDateTime" style="color: var(--text-light); font-weight: 600;"></small>
                    </div>
                </div>'''
html = html.replace(old_header_left, new_header_left)

# Wrap data tables
# Find all occurrences of <table class="data-table">...</table>
# A simple regex to wrap them:
html = re.sub(
    r'(<table class="data-table">.*?</table>)',
    r'<div class="table-responsive">\n                            \1\n                        </div>',
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update styles.css
with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add new CSS classes before the media query
new_css = '''
/* MOBILE MENU OVERLAY */
.sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 990;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.sidebar-overlay.active {
    opacity: 1;
    pointer-events: auto;
}

/* RESPONSIVE TABLE WRAPPER */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {'''

css = css.replace('@media (max-width: 768px) {', new_css)

# Update sidebar in medial query
old_sidebar_mobile = '''.sidebar {
        transform: translateX(-260px);
    }'''
new_sidebar_mobile = '''.sidebar {
        transform: translateX(-260px);
        transition: transform 0.3s ease;
        z-index: 1000;
    }
    
    .sidebar.active {
        transform: translateX(0);
    }
    
    .mobile-menu-btn {
        display: block !important;
    }
    
    .header-left h2 {
        font-size: 22px;
    }'''

if old_sidebar_mobile in css:
    css = css.replace(old_sidebar_mobile, new_sidebar_mobile)
else:
    # Fallback if whitespace differs
    css = re.sub(r'\.sidebar\s*\{\s*transform:\s*translateX\(-260px\);\s*\}', new_sidebar_mobile, css)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

# 3. Update script.js
with open('script.js', 'r', encoding='utf-8') as f:
    js = f.read()

mobile_menu_func = '''
// Mobile Menu Toggle
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}
'''

if 'function toggleMobileMenu' not in js:
    js = mobile_menu_func + js
    
    # insert mobile closure in navigateTo
    nav_to_addition = '''
    // Close mobile menu if open
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }
}'''
    js = re.sub(r'function navigateTo.*?\}\n', lambda m: m.group(0).rstrip()[:-1] + nav_to_addition, js, flags=re.DOTALL)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Modifications applied successfully.")
