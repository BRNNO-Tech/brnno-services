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
    const startTime = Date.now();
    try {
        if (!address || !address.trim()) {
            console.error('Geocoding error: Empty address provided');
            return null;
        }

        const zipCodePattern = /^\d{5}$/;
        const isZipCode = zipCodePattern.test(address.trim());
        console.log(`🔍 Geocoding ${isZipCode ? 'zip code' : 'address'}:`, address.trim());

        // Normalize the address input
        let normalizedAddress = address.trim();
        
        // If it's a 5-digit zip code, format it for better geocoding results
        if (isZipCode) {
            // Format as "ZIP_CODE, USA" for better geocoding results
            normalizedAddress = `${normalizedAddress}, USA`;
        }

        // Try Google Maps Geocoding first (if available and properly configured)
        // Skip Google if we know it's not configured (REQUEST_DENIED)
        const skipGoogle = localStorage.getItem('skip_google_geocoding') === 'true';
        if (!skipGoogle) {
            try {
                await loadGoogleMapsApi();

                if (window.google && window.google.maps && window.google.maps.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();

                    // Convert callback-based geocoding to promise with timeout
                    const response = await Promise.race([
                        new Promise((resolve, reject) => {
                            geocoder.geocode({ address: normalizedAddress }, (results, status) => {
                                if (status === 'OK' && results && results.length > 0) {
                                    resolve({ results, status });
                                } else if (status === 'REQUEST_DENIED') {
                                    // Mark to skip Google in future requests
                                    localStorage.setItem('skip_google_geocoding', 'true');
                                    reject(new Error('REQUEST_DENIED'));
                                } else if (status === 'ZERO_RESULTS') {
                                    reject(new Error('ZERO_RESULTS'));
                                } else {
                                    reject(new Error(`Geocoding failed with status: ${status}`));
                                }
                            });
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                    ]);

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
                            console.log('✅ Geocoding success (Google Maps):', coords);
                            return coords;
                        }
                    }
                }
            } catch (googleError) {
                // Google Maps failed, fall back to free service
                if (googleError.message === 'REQUEST_DENIED') {
                    console.log('⚠️ Google Geocoding API not authorized. Using free alternatives...');
                    console.log('💡 To fix: Enable Geocoding API in Google Cloud Console for your API key');
                } else {
                    console.log('⚠️ Google Geocoding unavailable, using free alternative...', googleError.message);
                }
            }
        } else {
            console.log('⏭️ Skipping Google Geocoding (not configured), using free alternatives...');
        }

        // For zip codes, use a direct coordinate lookup service
        if (isZipCode) {
            const zip = address.trim();
            
            // Method 1: Try Zippopotam.us to get city/state, then geocode
            try {
                console.log(`📍 Method 1: Looking up zip ${zip} via Zippopotam...`);
                const zippoResponse = await Promise.race([
                    fetch(`https://api.zippopotam.us/us/${zip}`, {
                        headers: { 'Accept': 'application/json' }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (zippoResponse.ok) {
                    const zippoData = await zippoResponse.json();
                    console.log('📍 Zippopotam data received:', zippoData);
                    if (zippoData.places && zippoData.places.length > 0) {
                        const place = zippoData.places[0];
                        const city = place['place name'];
                        const state = place.state;
                        const stateAbbr = place['state abbreviation'] || state;
                        console.log(`📍 Found location: ${city}, ${stateAbbr}`);
                        
                        // Try multiple geocoding queries with the city/state info
                        const queries = [
                            `${zip}`,
                            `${city}, ${stateAbbr} ${zip}`,
                            `${city}, ${state}, ${zip}`,
                            `${zip}, ${city}, ${stateAbbr}, USA`
                        ];
                        
                        for (let i = 0; i < queries.length; i++) {
                            const query = queries[i];
                            try {
                                console.log(`📍 Geocoding query ${i + 1}/${queries.length}: "${query}"`);
                                const geoResponse = await Promise.race([
                                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us&addressdetails=1`, {
                                        headers: {
                                            'User-Agent': 'Brnno Marketplace App',
                                            'Accept-Language': 'en-US,en;q=0.9'
                                        }
                                    }),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                                ]);
                                
                                if (geoResponse.ok) {
                                    const geoData = await geoResponse.json();
                                    console.log(`📍 Nominatim response for "${query}":`, geoData);
                                    if (geoData && geoData.length > 0) {
                                        const result = geoData[0];
                                        const coords = {
                                            lat: parseFloat(result.lat),
                                            lng: parseFloat(result.lon),
                                            formattedAddress: `${city}, ${stateAbbr} ${zip}`,
                                            city: city || '',
                                            state: stateAbbr || '',
                                            zip: zip
                                        };
                                        console.log('✅ Geocoding success (Zippopotam + Nominatim):', coords);
                                        return coords;
                                    }
                                } else {
                                    console.log(`⚠️ Nominatim returned status ${geoResponse.status} for "${query}"`);
                                }
                                // Small delay between queries
                                if (i < queries.length - 1) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                            } catch (err) {
                                console.log(`⚠️ Error geocoding "${query}":`, err.message);
                                continue;
                            }
                        }
                    } else {
                        console.log('⚠️ Zippopotam returned no places');
                    }
                } else {
                    console.log(`⚠️ Zippopotam returned status ${zippoResponse.status}`);
                }
            } catch (zippoError) {
                console.log('❌ Zippopotam lookup failed:', zippoError.message);
            }
            
            // Method 2: Direct Nominatim lookup with zip code
            try {
                console.log(`📍 Method 2: Direct Nominatim lookup for zip ${zip}...`);
                const directResponse = await Promise.race([
                    fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=us&format=json&limit=1&addressdetails=1`, {
                        headers: {
                            'User-Agent': 'Brnno Marketplace App',
                            'Accept-Language': 'en-US,en;q=0.9'
                        }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (directResponse.ok) {
                    const directData = await directResponse.json();
                    console.log('📍 Direct Nominatim response:', directData);
                    if (directData && directData.length > 0) {
                        const result = directData[0];
                        const coords = {
                            lat: parseFloat(result.lat),
                            lng: parseFloat(result.lon),
                            formattedAddress: result.display_name || `${zip}`,
                            city: result.address?.city || result.address?.town || result.address?.village || '',
                            state: result.address?.state || '',
                            zip: zip
                        };
                        console.log('✅ Geocoding success (Direct Nominatim):', coords);
                        return coords;
                    }
                } else {
                    console.log(`⚠️ Direct Nominatim returned status ${directResponse.status}`);
                }
            } catch (directError) {
                console.log('❌ Direct Nominatim lookup failed:', directError.message);
            }
        }

        // Fallback: Use free OpenStreetMap Nominatim geocoding service
        // This is completely free and doesn't require billing
        // For US zip codes, try multiple formats for better results
        let searchQueries = [normalizedAddress];
        
        // If it's a zip code, try additional formats
        if (isZipCode) {
            const zip = address.trim();
            searchQueries = [
                `${zip}, USA`,
                `${zip}, United States`,
                `${zip}, UT, USA`,  // Try with Utah state code
                `${zip}, Utah, USA`,  // Try with full Utah state name
                `ZIP code ${zip}, USA`,
                `ZIP code ${zip}, Utah, USA`,
                `${zip}, US`,  // Short country code
                `${zip}`  // Just the zip code
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
        const elapsed = Date.now() - startTime;
        console.error(`❌ Geocoding failed after ${elapsed}ms. Address:`, address);
        if (lastError) {
            console.error('Last error:', lastError);
        }
        return null;
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`❌ Geocoding error after ${elapsed}ms:`, error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            address: address
        });
        return null;
    }
}

