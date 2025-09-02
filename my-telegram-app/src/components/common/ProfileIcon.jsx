import React from 'react';
import { User } from 'lucide-react';

const ProfileIcon = ({ user, onClick }) => {
    if (!user) return null;

    // Use the photo_url provided by Telegram if it exists
    const photoUrl = user.photo_url;
    // Create initials as a fallback
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

    return (
        <button
            onClick={onClick}
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200"
            title="الملف الشخصي"
        >
            {photoUrl ? (
                <img 
                    src={photoUrl} 
                    alt="الملف الشخصي" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            ) : (
                <span className="text-sm font-bold">{initials || <User className="h-5 w-5" />}</span>
            )}
            
            {/* Fallback when image fails to load */}
            <div 
                className="w-full h-full flex items-center justify-center text-sm font-bold"
                style={{ display: photoUrl ? 'none' : 'flex' }}
            >
                {initials || <User className="h-5 w-5" />}
            </div>
            
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
        </button>
    );
};

export default ProfileIcon;