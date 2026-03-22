import os

script_path = 'd:/PROGRAM/LODGE ADMIN/script.js'
with open(script_path, 'r', encoding='utf-8') as f:
    script_data = f.read()

# 1. Update handleLogin to fetch data
old_login = """    if (firebaseEnabled && firebaseAuth) {
        try {
            await firebaseAuth.signInWithEmailAndPassword(email, password);
            showDashboard();
            syncAllBookingsToFirebase();
            syncAllCustomersToFirebase();
            return;
        } catch (error) {"""

new_login = """    if (firebaseEnabled && firebaseAuth) {
        try {
            await firebaseAuth.signInWithEmailAndPassword(email, password);
            // First, securely pull all cloud data to populate empty devices
            await fetchAllDataFromFirebase();
            showDashboard();
            syncAllBookingsToFirebase();
            syncAllCustomersToFirebase();
            return;
        } catch (error) {"""

if old_login in script_data:
    script_data = script_data.replace(old_login, new_login)

# 2. Add fetchAllDataFromFirebase function
fetch_function = """
async function fetchAllDataFromFirebase() {
    if (!firebaseEnabled || !firebaseDb) return;
    
    try {
        console.log("Fetching cloud data...");
        // 1. Fetch Customers
        const custSnap = await firebaseDb.collection('customers').get();
        const firebaseCustomers = [];
        custSnap.forEach(doc => {
            const cData = doc.data();
            if (cData.id) firebaseCustomers.push(cData);
        });
        
        // Merge Customers
        const localCustIds = new Set(data.customers.map(c => c.id));
        firebaseCustomers.forEach(fc => {
            if (!localCustIds.has(fc.id)) {
                data.customers.push(fc);
            } else {
                const idx = data.customers.findIndex(c => c.id === fc.id);
                data.customers[idx] = { ...data.customers[idx], ...fc }; // Cloud overrides local
            }
        });

        // 2. Fetch Bookings
        const bookSnap = await firebaseDb.collection('bookings').get();
        const firebaseBookings = [];
        bookSnap.forEach(doc => {
            const bData = doc.data();
            if (bData.id) firebaseBookings.push(bData);
        });
        
        // Merge Bookings
        const localBookIds = new Set(data.bookings.map(b => b.id));
        firebaseBookings.forEach(fb => {
            if (!localBookIds.has(fb.id)) {
                data.bookings.push(fb);
            } else {
                const idx = data.bookings.findIndex(b => b.id === fb.id);
                data.bookings[idx] = { ...data.bookings[idx], ...fb }; // Cloud overrides local
            }
        });
        
        saveDataToStorage();

        // If UI is already loaded, gently refresh the arrays
        if (typeof loadBookings === 'function') loadBookings();
        if (typeof refreshDashboardStats === 'function') refreshDashboardStats();
        
        console.log("Cloud sync complete!");
    } catch (error) {
        console.error("Could not fetch remote data:", error);
    }
}
"""

if 'async function fetchAllDataFromFirebase' not in script_data:
    script_data += fetch_function

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(script_data)

print("Firebase Pull Logic Injected Successfully")
