import React, { useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';
import DetailerCard from '../marketplace/DetailerCard';
import ProfileDropdown from '../common/ProfileDropdown';

export default function MarketplacePage({
    detailers,
    allDetailersCount,
    onSelectDetailer,
    currentUser,
    onGoToDashboard,
    onLogout,
    onLogin,
    showProfileDropdown,
    setShowProfileDropdown,
    address,
    onChangeLocation,
    searchQuery,
    onSearchChange,
    distanceFilter,
    onDistanceChange,
    sortBy,
    onSortChange
}) {
    const profileDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        }

        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileDropdown, setShowProfileDropdown]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Glassmorphic Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-blue-600/90 via-blue-700/90 to-indigo-600/90 border-b border-blue-400/20 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white drop-shadow-md">Brnno</h1>

                        {currentUser ? (
                            <div className="relative" ref={profileDropdownRef}>
                                <button
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ring-2 ring-white/30"
                                >
                                    {currentUser.initials}
                                </button>
                                {showProfileDropdown && (
                                    <ProfileDropdown
                                        currentUser={currentUser}
                                        onGoToDashboard={() => { setShowProfileDropdown(false); onGoToDashboard(); }}
                                        onLogout={onLogout}
                                    />
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white border-b border-gray-200 py-4">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-3">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search by city or ZIP code..."
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                            />
                        </div>

                        {/* Distance Filter */}
                        <select
                            value={distanceFilter}
                            onChange={(e) => onDistanceChange(Number(e.target.value))}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                        >
                            <option value={5}>Within 5 miles</option>
                            <option value={10}>Within 10 miles</option>
                            <option value={25}>Within 25 miles</option>
                            <option value={50}>Within 50 miles</option>
                            <option value={999}>Any distance</option>
                        </select>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                        >
                            <option value="distance">Sort: Distance</option>
                            <option value="price">Sort: Price</option>
                            <option value="rating">Sort: Rating</option>
                            <option value="reviews">Sort: Reviews</option>
                        </select>
                    </div>

                    {/* Current Location & Results Count */}
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">
                                Showing results near:
                            </span>
                            <strong className="text-gray-900">{address}</strong>
                            <button
                                onClick={onChangeLocation}
                                className="text-blue-600 hover:text-blue-700 font-medium ml-2"
                            >
                                Change
                            </button>
                        </div>
                        <span className="text-gray-500">
                            {detailers.length} of {allDetailersCount} detailer{allDetailersCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailer List */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {detailers.length === 0 ? (
                    <div className="text-center py-12">
                        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No detailers found</h3>
                        <p className="text-gray-600 mb-4">
                            Try adjusting your filters or search in a different area
                        </p>
                        <button
                            onClick={() => {
                                onSearchChange('');
                                onDistanceChange(50);
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">
                            Available Detailers
                        </h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {detailers.map((detailer) => (
                                <DetailerCard
                                    key={detailer.id}
                                    detailer={detailer}
                                    onClick={() => onSelectDetailer(detailer)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

