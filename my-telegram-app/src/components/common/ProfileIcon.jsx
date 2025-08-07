// src/components/common/ProfileIcon.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

const ProfileIcon = ({ user, onClick }) => {
    if (!user) return null;

    // Use the photo_url provided by Telegram if it exists
    const photoUrl = user.photo_url;
    // Create initials as a fallback (e.g., "John Doe" -> "JD")
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden shadow-lg border-2 border-white"
            title="Open Profile Settings"
        >
            {photoUrl ? (
                <img 
                    src={photoUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            ) : null}
            <div 
                className="w-full h-full flex items-center justify-center"
                style={{ display: photoUrl ? 'none' : 'flex' }}
            >
                {initials || (
                    <User className="h-5 w-5" />
                )}
            </div>
        </motion.button>
    );
};

export default ProfileIcon;
            ) : (
                <span>{initials}</span>
            )}
        </button>
    );
};

export default ProfileIcon;