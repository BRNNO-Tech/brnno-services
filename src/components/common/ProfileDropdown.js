import React from 'react';
import { User, LogOut } from 'lucide-react';

export default function ProfileDropdown({ currentUser, onGoToDashboard, onLogout }) {
    const handleDashboardClick = () => {
        if (onGoToDashboard) {
            onGoToDashboard();
        }
    };

    const handleLogoutClick = () => {
        if (onLogout) {
            onLogout();
        }
    };

    return (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="font-semibold text-gray-900">{currentUser.name}</div>
                <div className="text-sm text-gray-500">{currentUser.email}</div>
            </div>

            <button
                onClick={handleDashboardClick}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
            >
                <User className="w-5 h-5" />
                <span>My Dashboard</span>
            </button>

            <button
                onClick={handleLogoutClick}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
            >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
            </button>
        </div>
    );
}

