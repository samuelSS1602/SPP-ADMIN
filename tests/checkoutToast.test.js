const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bookingSrc = fs.readFileSync(path.join(__dirname, '..', 'booking.js'), 'utf8');
const scriptSrc = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

assert.ok(bookingSrc.includes('showToast({'), 'Checkout flow should use the in-app toast helper instead of browser alerts');
assert.ok(!bookingSrc.includes('alert(`Checkout successful.'), 'The checkout success message should no longer use a browser alert');
assert.ok(!scriptSrc.includes('confirm(`Checkout reminder is due'), 'Checkout reminders should not trigger a blocking browser confirm popup');

console.log('checkoutToast tests passed');
