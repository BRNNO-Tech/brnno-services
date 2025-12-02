import React from 'react';
import { Star, MapPin, Clock } from 'lucide-react';
import { getProviderHours } from '../../utils';

export default function DetailerCard({ detailer, onClick }) {
    // Default logo for Cloud Mobile if no image is set
    const isCloudMobile = detailer.name?.toLowerCase().includes('cloud mobile');
    const imageUrl = detailer.image || (isCloudMobile ? 'https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=Cloud+Mobile' : null);

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
            <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                {imageUrl ? (
                    <img src={imageUrl} alt={detailer.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
                        {detailer.name.charAt(0)}
                    </span>
                )}
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {detailer.name}
                </h3>

                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                        <Star className={`w-4 h-4 ${detailer.reviews > 0 ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`} />
                        {detailer.rating && detailer.reviews > 0 ? (
                            <>
                                <span className="font-semibold">{detailer.rating}</span>
                                <span className="text-sm text-gray-500">({detailer.reviews})</span>
                            </>
                        ) : (
                            <span className="text-sm text-gray-500">No reviews yet</span>
                        )}
                    </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{detailer.serviceArea} • {detailer.distance} mi</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{getProviderHours(detailer.defaultAvailability)}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Starting at</span>
                    <span className="font-bold text-lg text-gray-900">${detailer.price}</span>
                </div>
            </div>
        </div>
    );
}

