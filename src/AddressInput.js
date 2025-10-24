import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';
import locationService from './locationService';

const AddressInput = ({ initialValue = '', onAddressChange, placeholder = "Enter your address..." }) => {
    const [inputValue, setInputValue] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    // Debounced search for autocomplete
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (inputValue.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await locationService.getAutocompleteSuggestions(inputValue);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch (error) {
                console.error('Autocomplete error:', error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [inputValue]);

    // Handle input change
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        setSelectedSuggestion(null);
        
        // If user is typing (not selecting from suggestions), update parent
        if (!selectedSuggestion) {
            onAddressChange(value);
        }
    };

    // Handle suggestion selection
    const handleSuggestionClick = async (suggestion) => {
        setInputValue(suggestion.description);
        setSelectedSuggestion(suggestion);
        setShowSuggestions(false);
        setLoading(true);

        try {
            // Get full place details
            const placeDetails = await locationService.getPlaceDetails(suggestion.placeId);
            if (placeDetails) {
                onAddressChange(placeDetails.formattedAddress);
            } else {
                onAddressChange(suggestion.description);
            }
        } catch (error) {
            console.error('Error getting place details:', error);
            onAddressChange(suggestion.description);
        } finally {
            setLoading(false);
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && 
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        const currentIndex = suggestions.findIndex(s => s === selectedSuggestion);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
                setSelectedSuggestion(suggestions[nextIndex]);
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
                setSelectedSuggestion(suggestions[prevIndex]);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedSuggestion) {
                    handleSuggestionClick(selectedSuggestion);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
        }
    };

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    {loading ? (
                        <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                        <MapPin className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.placeId}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                                selectedSuggestion === suggestion ? 'bg-cyan-50' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {suggestion.structuredFormatting?.main_text || suggestion.description}
                                    </div>
                                    {suggestion.structuredFormatting?.secondary_text && (
                                        <div className="text-xs text-gray-500 truncate">
                                            {suggestion.structuredFormatting.secondary_text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressInput;
