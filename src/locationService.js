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
                this.autocompleteService = new google.maps.places.AutocompleteService();
                this.placesService = new google.maps.places.PlacesService(document.createElement('div'));
                console.log('Google Maps API loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load Google Maps API');
                this.googleMapsLoaded = true; // Set to true to prevent retries
                resolve(); // Resolve anyway to continue with fallback
            };
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

    // Get address autocomplete suggestions
    async getAutocompleteSuggestions(input, options = {}) {
        if (!this.autocompleteService) {
            console.log('Google Places API not available, using fallback');
            return [];
        }

        return new Promise((resolve) => {
            const request = {
                input: input,
                types: ['address'],
                componentRestrictions: { country: 'us' }, // Focus on US addresses
                ...options
            };

            this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const suggestions = predictions.map(prediction => ({
                        description: prediction.description,
                        placeId: prediction.place_id,
                        structuredFormatting: prediction.structured_formatting
                    }));
                    resolve(suggestions);
                } else {
                    console.log('Autocomplete failed:', status);
                    resolve([]);
                }
            });
        });
    }

    // Get place details from place ID
    async getPlaceDetails(placeId) {
        if (!this.placesService) {
            console.log('Google Places API not available');
            return null;
        }

        return new Promise((resolve) => {
            const request = {
                placeId: placeId,
                fields: ['formatted_address', 'geometry', 'address_components']
            };

            this.placesService.getDetails(request, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    resolve({
                        formattedAddress: place.formatted_address,
                        coordinates: {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        },
                        addressComponents: place.address_components
                    });
                } else {
                    console.log('Place details failed:', status);
                    resolve(null);
                }
            });
        });
    }

    // Get city/state from coordinates
    async reverseGeocode(lat, lng) {
        if (!this.geocoder) {
            console.log('Google Maps not available, using fallback');
            return { city: 'Unknown', state: 'UT', formattedAddress: 'Unknown location' };
        }

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
                    console.log(`Reverse geocoding failed: ${status}`);
                    resolve({ city: 'Unknown', state: 'UT', formattedAddress: 'Unknown location' });
                }
            });
        });
    }
}

export default new LocationService();
