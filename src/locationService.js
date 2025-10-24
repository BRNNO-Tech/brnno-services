// Location service for Google Maps API integration
class LocationService {
    constructor() {
        this.googleMapsLoaded = false;
        this.geocoder = null;
        this.placesService = null;
        this.map = null;
    }

    // Initialize Google Maps API
    async initialize(apiKey) {
        if (this.googleMapsLoaded) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
            script.onload = () => {
                this.googleMapsLoaded = true;
                this.geocoder = new google.maps.Geocoder();
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Convert address to coordinates
    async geocodeAddress(address) {
        if (!this.geocoder) throw new Error('Google Maps not initialized');

        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address
                    });
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }

    // Calculate distance between two points
    calculateDistance(point1, point2) {
        if (!this.googleMapsLoaded) return null;

        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLng = this.toRad(point2.lng - point1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    // Find providers within radius
    findProvidersInRadius(providers, centerPoint, radiusKm) {
        return providers.filter(provider => {
            if (!provider.coordinates) return false;

            const distance = this.calculateDistance(centerPoint, provider.coordinates);
            return distance <= radiusKm;
        });
    }

    // Get city/state from coordinates
    async reverseGeocode(lat, lng) {
        if (!this.geocoder) throw new Error('Google Maps not initialized');

        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const addressComponents = results[0].address_components;
                    let city = '';
                    let state = '';

                    addressComponents.forEach(component => {
                        if (component.types.includes('locality')) {
                            city = component.long_name;
                        }
                        if (component.types.includes('administrative_area_level_1')) {
                            state = component.long_name;
                        }
                    });

                    resolve({ city, state, formattedAddress: results[0].formatted_address });
                } else {
                    reject(new Error(`Reverse geocoding failed: ${status}`));
                }
            });
        });
    }
}

export default new LocationService();
