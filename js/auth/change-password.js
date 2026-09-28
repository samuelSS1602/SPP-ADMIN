
function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('active');
}

async function handlePasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match!");
        return;
    }

    if (!firebaseEnabled || !firebaseAuth) {
        alert("Authentication service is unavailable.");
        return;
    }

    const user = firebaseAuth.currentUser;
    if (!user) {
        alert("No user is currently signed in.");
        return;
    }

    const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Updating...";
    submitBtn.disabled = true;

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        alert("Password updated successfully!");
        closeChangePasswordModal();
    } catch (error) {
        console.error("Error changing password:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("The current password you entered is incorrect.");
        } else if (error.code === 'auth/weak-password') {
            alert("The new password is too weak. Please use at least 6 characters.");
        } else {
            alert("Failed to update password: " + error.message);
        }
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}
