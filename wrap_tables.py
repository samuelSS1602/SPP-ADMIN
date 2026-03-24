with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

parts = html.split('<table class="data-table">')
if len(parts) > 1:
    new_html = parts[0]
    for part in parts[1:]:
        sub_parts = part.split('</table>', 1)
        if len(sub_parts) == 2:
            inner_content = sub_parts[0]
            rest_content = sub_parts[1]
            new_html += '<div class="table-responsive">\\n                        <table class="data-table">' + inner_content + '</table>\\n                        </div>' + rest_content
        else:
            new_html += '<table class="data-table">' + part
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Tables wrapped successfully.")
