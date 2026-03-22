import re

# --- 1. SCRIPT.JS FIREBASE CUSTOMERS ---
script_path = 'd:/PROGRAM/LODGE ADMIN/script.js'
with open(script_path, 'r', encoding='utf-8') as f:
    script = f.read()

# Add sync logic for customers
customer_sync_logic = """
function syncAllCustomersToFirebase() {
    if (!firebaseEnabled || !firebaseDb) return;
    data.customers.forEach(customer => {
        syncCustomerToFirebase(customer);
    });
}

function syncCustomerToFirebase(customer) {
    if (!firebaseEnabled || !firebaseDb || !customer || !customer.id) return;

    const cloudCustomer = {
        ...customer,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    firebaseDb
        .collection('customers')
        .doc(String(customer.id))
        .set(cloudCustomer, { merge: true })
        .catch(error => {
            console.warn(`Failed to sync customer ${customer.id} to Firebase:`, error);
        });
}
"""

if 'syncAllCustomersToFirebase' not in script:
    script = script.replace('function downloadDailyRevenue() {', customer_sync_logic + '\nfunction downloadDailyRevenue() {')

# Hook syncAllCustomers to login success
script = script.replace('syncAllBookingsToFirebase();', 'syncAllBookingsToFirebase();\n            syncAllCustomersToFirebase();')

# Hook syncCustomer to addCustomer success
script = script.replace('data.customers.push(newCustomer);\n    saveDataToStorage();', 'data.customers.push(newCustomer);\n    saveDataToStorage();\n    syncCustomerToFirebase(newCustomer);')

# Hook syncCustomer to when customer edits happen (not strictly necessary if mostly handled by add, but good practice).

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(script)


# --- 2. RECEIPT.JS DISCOUNT UI ---
receipt_path = 'd:/PROGRAM/LODGE ADMIN/receipt.js'
with open(receipt_path, 'r', encoding='utf-8') as f:
    receipt = f.read()

# Remove the prompt block
prompt_old = r"""    let discountGross = booking\.discount \|\| 0;
    const userDiscountText = prompt\("Enter discount amount \(if any\):", discountGross\);
    if \(userDiscountText !== null\) \{
        discountGross = parseFloat\(userDiscountText\) \|\| 0;
        booking\.discount = discountGross;
        if \(typeof saveDataToStorage === 'function'\) saveDataToStorage\(\);
    \}"""
receipt = re.sub(prompt_old, "    let discountGross = booking.discount || 0;", receipt)

# Add Inline HTML UI just above the receipt-a4-container
container_old = '<div class="receipt-a4-container"'
container_new = """
        <div class="no-print" style="background:#f8fafc; padding:15px; text-align:center; border-bottom:1px solid #e2e8f0; margin-bottom:20px; border-radius:8px;">
            <label style="font-weight:600; color:#0f172a; font-family:'Inter',sans-serif;">Apply Discount (₹): </label>
            <input type="number" id="inlineDiscountInput" value="${discountGross}" style="padding:8px 12px; width:120px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:600; margin:0 10px;">
            <button onclick="applyDiscountToReceipt()" style="padding:8px 16px; background:var(--primary-brand); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif; box-shadow:0 4px 6px rgba(79, 70, 229, 0.2); transition:all 0.2s;">↻ Update Receipt</button>
            <p style="margin-top:8px; font-size:11px; color:#64748b;">(This perfectly adjusts the automated 5% GST layout below)</p>
        </div>
        <div class="receipt-a4-container\""""
receipt = receipt.replace(container_old, container_new)

# Add the apply function
if 'function applyDiscountToReceipt' not in receipt:
    discount_fn = """
window.applyDiscountToReceipt = function() {
    const val = parseFloat(document.getElementById('inlineDiscountInput').value) || 0;
    const booking = data.bookings.find(b => b.id === currentReceiptBookingId);
    if(booking) {
        booking.discount = val;
        if (typeof saveDataToStorage === 'function') saveDataToStorage();
        if (typeof syncBookingToFirebase === 'function') syncBookingToFirebase(booking);
        showReceipt(currentReceiptBookingId);
    }
};
"""
    receipt += discount_fn

# Add the css logic inside printReceipt to hide .no-print
printCSS_old = '@media print {'
printCSS_new = '@media print {\n                    .no-print { display: none !important; }'
receipt = receipt.replace(printCSS_old, printCSS_new)

with open(receipt_path, 'w', encoding='utf-8') as f:
    f.write(receipt)

print("Firebase Customer Storage and Discount UI enhancements successfully applied.")
