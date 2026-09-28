const assert = require('assert');
const fs = require('fs');
const path = require('path');

// The app code is split across js/<feature>/*.js; read every file so the checks cover all of it.
function readJsDir(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return readJsDir(full);
        return entry.name.endsWith('.js') ? fs.readFileSync(full, 'utf8') : '';
    }).join('\n');
}

const jsRoot = path.join(__dirname, '..', 'js');
const bookingSrc = readJsDir(path.join(jsRoot, 'bookings'));
const scriptSrc = readJsDir(jsRoot);

assert.ok(bookingSrc.includes('showToast({'), 'Checkout flow should use the in-app toast helper instead of browser alerts');
assert.ok(!bookingSrc.includes('alert(`Checkout successful.'), 'The checkout success message should no longer use a browser alert');
assert.ok(!scriptSrc.includes('confirm(`Checkout reminder is due'), 'Checkout reminders should not trigger a blocking browser confirm popup');

console.log('checkoutToast tests passed');
