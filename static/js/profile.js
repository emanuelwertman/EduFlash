// Simplified Profile page functionality
function initializeProfilePage() {
    console.log('Profile page initialized');
    
    // Avatar upload functionality
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', () => {
            alert('Avatar upload functionality would be implemented here');
        });
    }

    // Edit profile button - shows/hides settings section
    const editProfileBtn = document.getElementById('editProfileBtn');
    const settingsSection = document.getElementById('settings-section');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    console.log('Edit button:', editProfileBtn);
    console.log('Settings section:', settingsSection);
    
    let isEditing = false;
    
    if (editProfileBtn && settingsSection) {
        editProfileBtn.addEventListener('click', () => {
            console.log('Edit button clicked, isEditing:', isEditing);
            
            if (!isEditing) {
                // Show settings multiple ways to ensure it works
                settingsSection.style.display = 'block';
                settingsSection.style.visibility = 'visible';
                settingsSection.classList.add('show');
                editProfileBtn.textContent = 'Cancel Edit';
                isEditing = true;
                console.log('Settings shown');
            } else {
                // Hide settings
                settingsSection.style.display = 'none';
                settingsSection.classList.remove('show');
                editProfileBtn.textContent = 'Edit Profile';
                isEditing = false;
                console.log('Settings hidden');
            }
        });
    } else {
        console.log('Missing elements - editProfileBtn:', !!editProfileBtn, 'settingsSection:', !!settingsSection);
    }

    if (cancelEditBtn && settingsSection && editProfileBtn) {
        cancelEditBtn.addEventListener('click', () => {
            settingsSection.style.display = 'none';
            settingsSection.classList.remove('show');
            editProfileBtn.textContent = 'Edit Profile';
            isEditing = false;
            console.log('Settings cancelled');
        });
    }

    // Share profile button
    const shareProfileBtn = document.getElementById('shareProfileBtn');
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', () => {
            const profileUrl = `${window.location.origin}${window.location.pathname}#/profile`;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(profileUrl).then(() => {
                    showMessage('Profile link copied to clipboard!');
                }).catch(() => {
                    showMessage('Failed to copy link');
                });
            } else {
                showMessage('Profile URL: ' + profileUrl);
            }
        });
    }

    // Save settings button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn && editProfileBtn && settingsSection) {
        saveSettingsBtn.addEventListener('click', () => {
            // Get form values
            const displayName = document.getElementById('displayName').value;
            const username = document.getElementById('username').value;
            const bio = document.getElementById('bio').value;

            // Update profile display
            const profileName = document.getElementById('profileName');
            const profileUsername = document.getElementById('profileUsername');
            const profileBio = document.getElementById('profileBio');

            if (profileName) profileName.textContent = displayName;
            if (profileUsername) profileUsername.textContent = `@${username}`;
            if (profileBio) profileBio.textContent = bio;

            // Hide settings section
            settingsSection.style.display = 'none';
            settingsSection.classList.remove('show');
            editProfileBtn.textContent = 'Edit Profile';
            isEditing = false;

            showMessage('Profile updated successfully!');
        });
    }

    // Initialize current year in footer
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Simple message display function
function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent);
        color: white;
        padding: 12px 20px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 10000;
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Initialize when DOM is loaded or when navigating to profile
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, hash:', window.location.hash);
    if (window.location.hash.includes('/profile')) {
        initializeProfilePage();
    }
});

// Also initialize when hash changes (for SPA routing)
window.addEventListener('hashchange', function() {
    console.log('Hash changed to:', window.location.hash);
    if (window.location.hash.includes('/profile')) {
        setTimeout(initializeProfilePage, 100);
    }
});

// Initialize immediately when the script loads (for router-based loading)
setTimeout(() => {
    console.log('Profile.js loaded, initializing...');
    initializeProfilePage();
}, 50);

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeProfilePage };
}
