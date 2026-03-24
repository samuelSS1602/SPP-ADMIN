import re

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# remove backdrop-filter completely
css = re.sub(r'\s*backdrop-filter:\s*blur\([^)]+\);', '', css)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
