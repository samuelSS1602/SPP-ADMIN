
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.btn-login');
    const originalBtnHtml = loginBtn.innerHTML;

    if (firebaseEnabled && firebaseAuth) {
        try {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            loginBtn.disabled = true;
            loginBtn.style.cursor = 'not-allowed';
            loginBtn.style.opacity = '0.7';

            await firebaseAuth.signInWithEmailAndPassword(email, password);

            // First, securely pull all cloud data to populate empty devices
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching Data...';
            await fetchAllDataFromFirebase();

            // Detect user role from email
            const loggedInEmail = firebaseAuth.currentUser.email.toLowerCase();
            if (loggedInEmail === OWNER_EMAIL) {
                currentUserRole = 'owner';
                currentUserName = 'Owner';
            } else {
                currentUserRole = 'receptionist';
                currentUserName = 'Receptionist';
            }

            showDashboard();
            applyRoleRestrictions();
            syncAllBookingsToFirebase();

            // Reset button state just in case it's shown again after logout
            loginBtn.innerHTML = originalBtnHtml;
            loginBtn.disabled = false;
            loginBtn.style.cursor = 'pointer';
            loginBtn.style.opacity = '1';

            return;
        } catch (error) {
            loginBtn.innerHTML = originalBtnHtml;
            loginBtn.disabled = false;
            loginBtn.style.cursor = 'pointer';
            loginBtn.style.opacity = '1';
            alert(getFirebaseLoginErrorMessage(error));
            return;
        }
    }

    alert('Realtime login requires Firebase Authentication. Please use your Firebase user credentials.');
}

function getFirebaseLoginErrorMessage(error) {
    const code = (error && error.code) ? String(error.code) : '';

    if (code === 'auth/invalid-credential') {
        return 'Login failed: invalid credential. Check email/password and verify Email/Password sign-in is enabled in Firebase Console > Authentication > Sign-in method. Also confirm this app is using the same Firebase project where the user account exists.';
    }

    if (code === 'auth/user-not-found') {
        return 'Login failed: this user does not exist in Firebase Authentication for the configured project.';
    }

    if (code === 'auth/wrong-password') {
        return 'Login failed: password is incorrect.';
    }

    if (code === 'auth/invalid-email') {
        return 'Login failed: email address format is invalid.';
    }

    if (code === 'auth/too-many-requests') {
        return 'Login temporarily blocked due to too many attempts. Please wait and try again.';
    }

    if (code === 'auth/network-request-failed') {
        return 'Login failed due to a network error. Check internet connection and try again.';
    }

    return `Firebase login failed: ${(error && error.message) ? error.message : 'Unknown error'}`;
}

// Quick fix function for booking status changes (for admin use)
window.fixBookingStatus = function(bookingId, newStatus) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) {
        alert(`Booking ${bookingId} not found!`);
        return false;
    }
    
    const oldStatus = booking.status;
    booking.status = newStatus;
    
    // If changing to completed, set checkout date/time
    if (newStatus === 'completed' && !booking.actualCheckOutDate) {
        booking.actualCheckOutDate = getLocalISODate();
        booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    }
    
    saveDataToStorage();
    syncBookingToFirebase(booking);
    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();
    
    alert(`✓ Booking ${bookingId} status changed from "${oldStatus}" to "${newStatus}"`);
    console.log(`Fixed booking ${bookingId}: ${oldStatus} → ${newStatus}`);
    return true;
};

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'grid';
    startCheckoutReminderService();

    setTimeout(() => {
        loadDashboard();
        createCharts();
    }, 100);
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (firebaseEnabled && firebaseAuth) {
            try {
                await firebaseAuth.signOut();
            } catch (error) {
                console.warn('Firebase sign out failed:', error);
            }
        }

        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('dashboardPage').style.display = 'none';
        document.getElementById('loginForm').reset();
        destroyCharts();
        stopCheckoutReminderService();

        // Reset role state
        currentUserRole = 'receptionist';
        currentUserName = 'Receptionist';
        document.body.classList.remove('owner-view');
    }
}
