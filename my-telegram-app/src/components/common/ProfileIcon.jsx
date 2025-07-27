// src/components/common/ProfileIcon.jsx
import React from 'react';

const ProfileIcon = ({ user, onClick }) => {
    if (!user) return null;

    // Use the photo_url provided by Telegram if it exists
    const photoUrl = user.photo_url;
    // Create initials as a fallback (e.g., "John Doe" -> "JD")
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

    return (
        <button
            onClick={onClick}
            className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden"
            title="Open Profile Settings"
        >
            {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <span>{initials}</span>
            )}
        </button>
    );
};

export default ProfileIcon;