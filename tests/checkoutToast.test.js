import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function readDir(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return readDir(full);
        return /\.(js|jsx)$/.test(entry.name) ? fs.readFileSync(full, 'utf8') : '';
    }).join('\n');
}

test('checkout uses in-app toasts, never blocking popups', () => {
    const bookingSrc = fs.readFileSync(path.join(root, 'services', 'bookings.js'), 'utf8');
    const allSrc = readDir(root);
    assert.ok(bookingSrc.includes("showToast({ title: 'Guest Checked Out'"), 'checkout success shows a toast');
    assert.ok(!bookingSrc.includes('alert(`Checkout successful.'), 'checkout success is not a browser alert');
    assert.ok(!allSrc.includes('confirm(`Checkout reminder is due'), 'checkout reminders never block with confirm()');
});

test('booking documents never carry base64 photos', () => {
    const syncSrc = fs.readFileSync(path.join(root, 'firebase', 'sync.js'), 'utf8');
    assert.ok(syncSrc.includes("key === 'customerPhoto' || key === 'idProofPhoto'"));
    assert.ok(syncSrc.includes("String(booking[key]).startsWith('data:')"));
});
