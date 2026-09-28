
function applyRoleRestrictions() {
    // Update profile display
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) profilePic.textContent = currentUserRole === 'owner' ? 'O' : 'R';

    const userProfileDiv = document.querySelector('.user-profile');
    if (userProfileDiv) {
        const innerDiv = userProfileDiv.querySelector('div:last-child');
        if (innerDiv) {
            const nameEl = innerDiv.querySelector('div');
            const emailEl = innerDiv.querySelector('small');
            if (nameEl) nameEl.textContent = currentUserName;
            if (emailEl && firebaseAuth && firebaseAuth.currentUser) {
                emailEl.textContent = firebaseAuth.currentUser.email;
            }

            // Add or update role badge
            let roleBadge = document.getElementById('roleBadge');
            if (!roleBadge) {
                roleBadge = document.createElement('div');
                roleBadge.id = 'roleBadge';
                innerDiv.appendChild(roleBadge);
            }
            roleBadge.className = `role-badge ${currentUserRole}`;
            roleBadge.textContent = currentUserRole === 'owner' ? '👑 Owner' : '🛎️ Receptionist';
        }
    }

    // Toggle body class for CSS-based hiding
    if (currentUserRole === 'owner') {
        document.body.classList.add('owner-view');
    } else {
        document.body.classList.remove('owner-view');
    }
}
