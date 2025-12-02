import config from '../config';

const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Dynamically load Google Maps JS API (with Places)
let googleMapsApiLoadPromise;
export function loadGoogleMapsApi() {
    if (window.google && window.google.maps) return Promise.resolve();
    if (googleMapsApiLoadPromise) return googleMapsApiLoadPromise;
    googleMapsApiLoadPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById('google-maps-js');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
            return;
        }
        const script = document.createElement('script');
        script.id = 'google-maps-js';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });
    return googleMapsApiLoadPromise;
}

// Geocode address to coordinates using Google Maps API
export async function geocodeAddress(address) {
    try {
        if (!address || !address.trim()) {
            console.error('Geocoding error: Empty address provided');
            return null;
        }

        // Normalize the address input
        let normalizedAddress = address.trim();
        
        // If it's a 5-digit zip code, format it for better geocoding results
        const zipCodePattern = /^\d{5}$/;
        if (zipCodePattern.test(normalizedAddress)) {
            // Format as "ZIP_CODE, USA" for better geocoding results
            normalizedAddress = `${normalizedAddress}, USA`;
        }

        // Try Google Maps Geocoding first (if available)
        try {
            await loadGoogleMapsApi();

            if (window.google && window.google.maps && window.google.maps.Geocoder) {
                const geocoder = new window.google.maps.Geocoder();

                // Convert callback-based geocoding to promise
                const response = await new Promise((resolve, reject) => {
                    geocoder.geocode({ address: normalizedAddress }, (results, status) => {
                        if (status === 'OK' && results && results.length > 0) {
                            resolve({ results, status });
                        } else if (status === 'REQUEST_DENIED') {
                            reject(new Error('REQUEST_DENIED'));
                        } else if (status === 'ZERO_RESULTS') {
                            reject(new Error('ZERO_RESULTS'));
                        } else {
                            reject(new Error(`Geocoding failed with status: ${status}`));
                        }
                    });
                });

                if (response && response.results && response.results.length > 0) {
                    const result = response.results[0];
                    if (result && result.geometry && result.geometry.location) {
                        const byType = (type) => result.address_components?.find(c => c.types.includes(type));
                        const coords = {
                            lat: result.geometry.location.lat(),
                            lng: result.geometry.location.lng(),
                            formattedAddress: result.formatted_address,
                            city: byType('locality')?.long_name || '',
                            state: byType('administrative_area_level_1')?.short_name || '',
                            zip: byType('postal_code')?.long_name || ''
                        };
                        console.log('Geocoding success (Google Maps):', coords);
                        return coords;
                    }
                }
            }
        } catch (googleError) {
            // Google Maps failed, fall back to free service
            console.log('Google Geocoding unavailable, using free alternative...', googleError);
        }

        // Fallback: Use free OpenStreetMap Nominatim geocoding service
        // This is completely free and doesn't require billing
        // For US zip codes, try multiple formats for better results
        let searchQueries = [normalizedAddress];
        
        // If it's a zip code, try additional formats
        if (zipCodePattern.test(address.trim())) {
            const zip = address.trim();
            searchQueries = [
                `${zip}, USA`,
                `${zip}, United States`,
                `${zip}, UT, USA`,  // Try with Utah state code
                `ZIP code ${zip}, USA`,
                `${zip}`
            ];
        }

        let lastError = null;
        for (let i = 0; i < searchQueries.length; i++) {
            const query = searchQueries[i];
            try {
                // Add a small delay between requests to avoid rate limiting (except for first request)
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                const encodedAddress = encodeURIComponent(query);
                const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us&addressdetails=1`;

                const response = await fetch(nominatimUrl, {
                    headers: {
                        'User-Agent': 'Brnno Marketplace App', // Required by Nominatim
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                });

                if (!response.ok) {
                    // If rate limited, wait and retry
                    if (response.status === 429) {
                        console.log('Rate limited, waiting 2 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        // Retry the same query
                        i--;
                        continue;
                    }
                    throw new Error(`Nominatim API error: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    const coords = {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                        formattedAddress: result.display_name || address,
                        city: result.address?.city || result.address?.town || result.address?.village || '',
                        state: result.address?.state || '',
                        zip: result.address?.postcode || address.trim()
                    };
                    console.log('Geocoding success (Nominatim):', coords);
                    return coords;
                }
            } catch (error) {
                lastError = error;
                console.log(`Geocoding attempt failed for "${query}":`, error.message);
                // Continue to next query format
            }
        }

        // If all attempts failed
        console.error('Geocoding error: No results found for address after all attempts:', address);
        if (lastError) {
            console.error('Last error:', lastError);
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

