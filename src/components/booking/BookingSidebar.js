import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, Car, Star, Mail, Phone, MessageSquare, CheckCircle2
} from 'lucide-react';
import { auth, db } from '../../firebase/config';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ADD_ONS } from '../../data/packages';
import PaymentForm from '../PaymentForm';
import {
    generateAvailableTimesForDate
} from '../../utils';
import {
    notifyNewBooking,
    notifyPaymentReceived,
    notifyBookingConfirmed
} from '../../services/notificationService';

export default function BookingSidebar({
    detailer,
    selectedPackage: selectedPackageProp,
    setSelectedPackage: setSelectedPackageProp,
    selectedAddOns: selectedAddOnsProp,
    setSelectedAddOns: setSelectedAddOnsProp,
    selectedDate: selectedDateProp,
    setSelectedDate: setSelectedDateProp,
    selectedTime: selectedTimeProp,
    setSelectedTime: setSelectedTimeProp,
    onBookNow,
    isBooking: isBookingProp,
    currentUser: currentUserProp,
    address,
    answers,
    setAddress,
    setAnswers,
    onBook, // backward compatibility
    onShowSignup,
    onShowGuestCheckout,
    guestBookingInfo // Guest info from modal
}) {
    // Local state fallbacks if parent doesn't control these
    const [selectedPackageState, setSelectedPackageState] = useState(selectedPackageProp || null);
    const [selectedAddOnsState, setSelectedAddOnsState] = useState(selectedAddOnsProp || []);
    const [selectedTimeState, setSelectedTimeState] = useState(selectedTimeProp || '');
    const [selectedDateState, setSelectedDateState] = useState(selectedDateProp || '');
    const [isBookingState, setIsBookingState] = useState(!!isBookingProp);
    const [packageExpanded, setPackageExpanded] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [bookingData, setBookingData] = useState(null);

    const selectedPackage = selectedPackageProp ?? selectedPackageState;
    const setSelectedPackage = setSelectedPackageProp ?? setSelectedPackageState;
    const selectedAddOns = selectedAddOnsProp ?? selectedAddOnsState;
    const setSelectedAddOns = setSelectedAddOnsProp ?? setSelectedAddOnsState;
    const selectedTime = selectedTimeProp ?? selectedTimeState;
    const setSelectedTime = setSelectedTimeProp ?? setSelectedTimeState;
    const selectedDate = selectedDateProp ?? selectedDateState;
    const setSelectedDate = setSelectedDateProp ?? setSelectedDateState;
    const isBooking = isBookingProp ?? isBookingState;

    // Get current user from auth if not provided
    const currentUser = currentUserProp || auth.currentUser;

    // Available packages from detailer, sorted by price (low to high)
    const availablePackages = useMemo(() => {
        if (!detailer.packages || detailer.packages.length === 0) return [];
        // Create a copy to avoid mutating the original array
        const sorted = [...detailer.packages].sort((a, b) => {
            const priceA = Number(a.price) || 0;
            const priceB = Number(b.price) || 0;
            return priceA - priceB; // Sort low to high
        });
        return sorted;
    }, [detailer.packages]);

    // Available add-ons (from detailer or all add-ons)
    const availableAddOnsList = detailer.addOns
        ? ADD_ONS.filter(addon => detailer.addOns.includes(addon.id))
        : ADD_ONS;

    // Calculate total price: package price + add-ons
    const totalPrice = useMemo(() => {
        let price = 0;
        if (selectedPackage) {
            // Use single price
            price = selectedPackage.price;
        }
        // Add selected add-ons
        selectedAddOns.forEach(addOnId => {
            const addOn = ADD_ONS.find(a => a.id === addOnId);
            if (addOn) {
                price += addOn.price;
            }
        });
        return price;
    }, [selectedPackage, selectedAddOns]);

    useEffect(() => {
        // Reset selection when detailer changes
        setSelectedPackage(null);
        setSelectedAddOns([]);
        setPackageExpanded(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailer]);

    // Calculate available times based on selected date
    const availableTimesForSelectedDate = useMemo(() => {
        if (!selectedDate) {
            return [];
        }

        // If provider has defaultAvailability, use it for dynamic times
        if (detailer.defaultAvailability) {
            return generateAvailableTimesForDate(
                detailer.defaultAvailability,
                detailer.dateOverrides || {},
                selectedDate
            );
        }

        // Fallback to static availableTimes if defaultAvailability is not set
        // This handles providers who haven't set up their schedule yet
        if (detailer.availableTimes && detailer.availableTimes.length > 0) {
            return detailer.availableTimes;
        }

        return [];
    }, [selectedDate, detailer.defaultAvailability, detailer.dateOverrides, detailer.availableTimes]);

    // Clear selected time when date changes and no times available
    useEffect(() => {
        if (selectedDate && availableTimesForSelectedDate.length === 0) {
            setSelectedTime('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, availableTimesForSelectedDate]);

    // Toggle add-on selection
    const toggleAddOn = (addOnId) => {
        setSelectedAddOns(prev =>
            prev.includes(addOnId)
                ? prev.filter(id => id !== addOnId)
                : [...prev, addOnId]
        );
    };

    // Handle guest checkout continuation (guest info is passed as prop)
    async function handleGuestCheckoutContinue(guestInfo) {
        if (!guestInfo || !guestInfo.email) {
            alert('Please provide a valid email address');
            return;
        }

        // Validate booking requirements
        if (!selectedPackage) {
            alert('Please select a package');
            return;
        }

        if (!selectedTime) {
            alert('Please select a time');
            return;
        }

        if (!selectedDate) {
            alert('Please select a date');
            return;
        }

        // Get the actual provider userId from the provider document
        let actualProviderUserId = detailer.userId;
        if (!actualProviderUserId) {
            try {
                const providerDocRef = doc(db, 'providers', detailer.id);
                const providerDocSnap = await getDoc(providerDocRef);
                if (providerDocSnap.exists()) {
                    actualProviderUserId = providerDocSnap.data().userId;
                }
            } catch (err) {
                console.warn('Could not fetch provider userId:', err);
            }
        }

        if (!actualProviderUserId) {
            console.error('ERROR: No provider userId found! Cannot create booking without providerUserId.');
            alert('Error: Could not determine provider information. Please try again.');
            return;
        }

        // Store booking data for guest and show payment modal
        const bookingDataToStore = {
            isGuest: true,
            customerEmail: guestInfo.email,
            customerName: guestInfo.name || '',
            customerId: null, // No authenticated user
            providerId: detailer.id,
            providerUserId: actualProviderUserId,
            providerName: detailer.name,
            // Store package data
            packageId: selectedPackage.id,
            packageName: selectedPackage.name,
            packagePrice: selectedPackage.price,
            exteriorServices: selectedPackage.exteriorServices || [],
            interiorServices: selectedPackage.interiorServices || [],
            addOns: selectedAddOns.map(addOnId => {
                const addOn = ADD_ONS.find(a => a.id === addOnId);
                return addOn ? { id: addOn.id, name: addOn.name, price: addOn.price } : null;
            }).filter(Boolean),
            // Keep serviceName for backward compatibility
            serviceName: selectedPackage.name,
            // Store total price
            price: totalPrice,
            date: selectedDate,
            time: selectedTime,
            address: address,
            vehicleType: answers.vehicleType,
            preferredTimeSlot: answers.timeSlot,
            status: 'pending',
        };

        setBookingData(bookingDataToStore);
        setShowPayment(true);
    }

    async function handleBookNow() {
        if (!currentUser) {
            // If guest info exists, proceed with guest booking
            if (guestBookingInfo && guestBookingInfo.email) {
                // Guest checkout flow - proceed with booking
                await handleGuestCheckoutContinue(guestBookingInfo);
                return;
            }
            // Show guest checkout modal with options: Sign Up or Continue as Guest
            if (onShowGuestCheckout) {
                onShowGuestCheckout();
            } else if (onShowSignup) {
                onShowSignup();
            } else {
                alert('Please sign up or log in to book a service');
            }
            return;
        }

        // Prevent providers from booking services
        try {
            // Check if user is a detailer
            const detailerDoc = await getDoc(doc(db, 'detailer', currentUser.uid));
            if (detailerDoc.exists()) {
                alert('Providers cannot book services. Please use your provider dashboard to manage bookings.');
                return;
            }
        } catch (err) {
            console.warn('Could not check if user is provider:', err);
        }

        if (!selectedPackage) {
            alert('Please select a package');
            return;
        }

        if (!selectedTime) {
            alert('Please select a time');
            return;
        }

        if (!selectedDate) {
            alert('Please select a date');
            return;
        }

        // Get the actual provider userId from the provider document
        let actualProviderUserId = detailer.userId;
        if (!actualProviderUserId) {
            try {
                const providerDocRef = doc(db, 'providers', detailer.id);
                const providerDocSnap = await getDoc(providerDocRef);
                if (providerDocSnap.exists()) {
                    actualProviderUserId = providerDocSnap.data().userId;
                }
            } catch (err) {
                console.warn('Could not fetch provider userId:', err);
            }
        }

        if (!actualProviderUserId) {
            console.error('ERROR: No provider userId found! Cannot create booking without providerUserId.');
            alert('Error: Could not determine provider information. Please try again.');
            return;
        }

        // Store booking data and show payment modal
        const bookingDataToStore = {
            customerId: currentUser.uid,
            customerEmail: currentUser.email,
            providerId: detailer.id,
            providerUserId: actualProviderUserId,
            providerName: detailer.name,
            // Store package data
            packageId: selectedPackage.id,
            packageName: selectedPackage.name,
            packagePrice: selectedPackage.price,
            exteriorServices: selectedPackage.exteriorServices || [],
            interiorServices: selectedPackage.interiorServices || [],
            addOns: selectedAddOns.map(addOnId => {
                const addOn = ADD_ONS.find(a => a.id === addOnId);
                return addOn ? { id: addOn.id, name: addOn.name, price: addOn.price } : null;
            }).filter(Boolean),
            // Keep serviceName for backward compatibility
            serviceName: selectedPackage.name,
            // Store total price
            price: totalPrice,
            date: selectedDate,
            time: selectedTime,
            address: address,
            vehicleType: answers.vehicleType,
            preferredTimeSlot: answers.timeSlot,
            status: 'pending',
        };

        setBookingData(bookingDataToStore);
        setShowPayment(true);
    }

    // Handle payment completion
    async function handlePaymentComplete(paymentResult) {
        if (paymentResult.status !== 'succeeded') {
            alert('Payment failed. Please try again.');
            setShowPayment(false);
            return;
        }

        setIsBookingState(true);
        try {
            // Create booking after payment succeeds
            // Support guest bookings (no auth required)
            const isGuestBooking = !currentUser || bookingData?.isGuest === true;
            const finalBookingData = {
                ...bookingData,
                ...(paymentResult.paymentIntent?.id && { paymentIntentId: paymentResult.paymentIntent.id }),
                ...(isGuestBooking && { isGuest: true, customerEmail: bookingData.customerEmail }),
                paymentStatus: 'paid',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const bookingRef = await addDoc(collection(db, 'bookings'), finalBookingData);
            const bookingId = bookingRef.id;

            // Create notifications for provider
            try {
                const bookingWithId = { ...finalBookingData, id: bookingId };
                // Notify provider of new booking
                await notifyNewBooking(bookingData.providerUserId, bookingWithId);
                // Notify provider of payment received
                await notifyPaymentReceived(bookingData.providerUserId, bookingWithId);
                // Notify provider of booking confirmed
                await notifyBookingConfirmed(bookingData.providerUserId, bookingWithId);
            } catch (notifError) {
                console.warn('Failed to create notifications:', notifError);
            }

            const serviceText = bookingData.packageName || bookingData.serviceName || 'service';
            alert(`Booking confirmed! Your ${serviceText} is scheduled for ${bookingData.date} at ${bookingData.time}.`);

            // Send email receipt for guest bookings
            if (isGuestBooking && bookingData.customerEmail) {
                try {
                    await fetch('/api/send-receipt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: bookingData.customerEmail,
                            bookingId: bookingId,
                            bookingData: {
                                ...finalBookingData,
                                id: bookingId
                            }
                        })
                    });
                } catch (emailError) {
                    console.warn('Failed to send email receipt:', emailError);
                    // Don't fail the booking if email fails
                }
            }

            setShowPayment(false);
            setBookingData(null);

            // Optionally redirect or refresh
            window.location.href = '#';
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Payment succeeded but failed to create booking. Please contact support.');
        } finally {
            setIsBookingState(false);
        }
    }

    // Simple helper editors for address/vehicle
    const handleChangeAddress = () => {
        if (!setAddress) return;
        const updated = window.prompt('Where should the detailer meet you?', address || '');
        if (updated !== null) {
            const trimmed = updated.trim();
            if (trimmed) {
                setAddress(trimmed);
            }
        }
    };

    const handleChangeVehicle = () => {
        if (!setAnswers) return;
        const updated = window.prompt('What vehicle should we service?', answers?.vehicleType || '');
        if (updated !== null) {
            const trimmed = updated.trim();
            if (trimmed) {
                setAnswers(prev => ({
                    ...prev,
                    vehicleType: trimmed
                }));
            }
        }
    };

    // Contact handlers
    const handleEmail = () => {
        if (!detailer?.email) return;
        const serviceText = selectedPackage ? selectedPackage.name : 'your booking';
        window.location.href = `mailto:${detailer.email}?subject=Question about ${serviceText}`;
    };

    const handleCall = () => {
        if (!detailer?.phone) return;
        window.location.href = `tel:${detailer.phone}`;
    };

    const handleSupport = () => {
        window.location.href = 'mailto:support@brnno.com?subject=Customer Support Request';
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
            {/* Provider Info */}
            <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {detailer.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{detailer.name}</h3>
                        <div className="flex items-center gap-1 text-sm">
                            <Star className={`w-4 h-4 ${detailer.reviews > 0 ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`} />
                            {detailer.rating && detailer.reviews > 0 ? (
                                <>
                                    <span className="font-semibold">{detailer.rating}</span>
                                    <span className="text-gray-500">({detailer.reviews})</span>
                                </>
                            ) : (
                                <span className="text-gray-500">No reviews yet</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Serves {detailer.serviceArea || 'your area'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4" />
                        <span>{detailer.distance} miles from you</span>
                    </div>
                </div>

                {/* Contact Provider Buttons */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Contact Provider</p>
                    <div className="flex gap-2">
                        {detailer.email && (
                            <button onClick={handleEmail} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                            </button>
                        )}
                        {detailer.phone && (
                            <button onClick={handleCall} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                <Phone className="w-4 h-4" />
                                Call
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer's Booking Info */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">{(currentUser?.displayName || currentUser?.email || 'Your').split(' ')[0]}'s Booking</h3>

                {/* Service Location */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Service Location</span>
                        {setAddress && (
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium" onClick={handleChangeAddress}>
                                Change
                            </button>
                        )}
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800">{address}</p>
                    </div>
                </div>

                {/* Vehicle */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Your Vehicle</span>
                        {setAnswers && (
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium" onClick={handleChangeVehicle}>
                                Change
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-600" />
                        <p className="text-sm text-gray-800">{answers?.vehicleType}</p>
                    </div>
                </div>
            </div>

            {/* Select Package */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Select Package</h4>
                    {selectedPackage && (
                        <button
                            onClick={() => setPackageExpanded(!packageExpanded)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {packageExpanded ? 'Hide' : 'Show'} Packages
                        </button>
                    )}
                </div>

                {/* Show selected package summary when collapsed */}
                {selectedPackage && !packageExpanded && (
                    <div className="mb-4 space-y-2">
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="font-semibold text-gray-900">{selectedPackage.name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-900">${selectedPackage.price}</div>
                                </div>
                            </div>
                            {selectedAddOns.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs text-gray-600 mb-1">Add-ons:</div>
                                    {selectedAddOns.map(addOnId => {
                                        const addOn = ADD_ONS.find(a => a.id === addOnId);
                                        return addOn ? (
                                            <div key={addOnId} className="text-xs text-gray-700">+ {addOn.name} (${addOn.price})</div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900 text-sm">Total:</span>
                                <span className="font-bold text-gray-900">${totalPrice}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setPackageExpanded(true)}
                            className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Change Package
                        </button>
                    </div>
                )}

                {/* Packages list - only show when expanded or no package selected */}
                {(packageExpanded || !selectedPackage) && (
                    <div className="space-y-3">
                        {availablePackages.length === 0 ? (
                            <p className="text-sm text-gray-500">No packages available.</p>
                        ) : (
                            availablePackages.map((pkg) => {
                                const isSelected = selectedPackage?.id === pkg.id;
                                return (
                                    <div
                                        key={pkg.id}
                                        onClick={() => setSelectedPackage(pkg)}
                                        className={`w-full text-left p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <input
                                                    type="radio"
                                                    checked={isSelected}
                                                    onChange={() => setSelectedPackage(pkg)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0 mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 text-base mb-1">{pkg.name}</div>
                                                    <div className="text-xs text-gray-500 mb-2">{pkg.description}</div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="font-bold text-gray-900">${pkg.price}</div>
                                            </div>
                                        </div>

                                        {/* Show services included when selected */}
                                        {isSelected && (
                                            <div className="mt-3 pt-3 border-t border-blue-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <div className="font-semibold text-gray-700 mb-1">Exterior:</div>
                                                        <ul className="space-y-1 text-gray-600">
                                                            {pkg.exteriorServices.map((svc, idx) => (
                                                                <li key={idx} className="flex items-start">
                                                                    <CheckCircle2 className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                                                    <span>{svc}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-700 mb-1">Interior:</div>
                                                        <ul className="space-y-1 text-gray-600">
                                                            {pkg.interiorServices.map((svc, idx) => (
                                                                <li key={idx} className="flex items-start">
                                                                    <CheckCircle2 className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                                                    <span>{svc}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Add-ons section - only show when package is selected */}
                {selectedPackage && availableAddOnsList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-3 text-sm">Add-ons (Optional)</h5>
                        <div className="space-y-2">
                            {availableAddOnsList.map((addOn) => {
                                const isSelected = selectedAddOns.includes(addOn.id);
                                return (
                                    <div
                                        key={addOn.id}
                                        onClick={() => toggleAddOn(addOn.id)}
                                        className={`w-full text-left px-3 py-2 border-2 rounded-lg transition-all cursor-pointer ${isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleAddOn(addOn.id)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 text-sm">{addOn.name}</div>
                                                    <div className="text-xs text-gray-500">{addOn.description}</div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="font-bold text-gray-900 text-sm">+${addOn.price}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop: Regular date/time selection */}
            <div className="hidden lg:block">
                {/* Select Date */}
                <div className="mb-6">
                    <label className="block font-semibold text-gray-900 mb-3">Select Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                    />
                </div>

                {/* Select Time */}
                <div className="mb-6">
                    <label className="block font-semibold text-gray-900 mb-3">Select Time</label>
                    {availableTimesForSelectedDate.length === 0 ? (
                        <div className="p-4 bg-gray-100 border-2 border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 font-medium">
                                {selectedDate ? 'Closed - No availability on this day' : 'Please select a date first'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {availableTimesForSelectedDate.map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${selectedTime === time ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-300'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Total */}
                {selectedPackage && (
                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                        <div className="mb-2 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{selectedPackage.name}:</span>
                                <span className="text-gray-900 font-medium">${selectedPackage.price}</span>
                            </div>
                            {selectedAddOns.map(addOnId => {
                                const addOn = ADD_ONS.find(a => a.id === addOnId);
                                return addOn ? (
                                    <div key={addOnId} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">+ {addOn.name}:</span>
                                        <span className="text-gray-900 font-medium">${addOn.price}</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                            <span className="text-gray-600 font-medium">Total:</span>
                            <span className="text-3xl font-bold text-gray-900">${totalPrice}</span>
                        </div>
                    </div>
                )}

                {/* Book Button */}
                <button
                    onClick={onBookNow || handleBookNow}
                    disabled={isBooking || !selectedPackage || !selectedTime || !selectedDate}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed mb-4"
                >
                    {isBooking
                        ? 'Booking...'
                        : !selectedPackage
                            ? 'Select Package'
                            : `Book ${selectedPackage.name}`
                    }
                </button>
            </div>

            {/* Mobile: Sticky footer with date/time and book button */}
            <div className="lg:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6 mt-6 shadow-lg">
                {/* Total */}
                {selectedPackage && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="mb-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate pr-2">{selectedPackage.name}:</span>
                                <span className="text-gray-900 font-medium">${selectedPackage.price}</span>
                            </div>
                            {selectedAddOns.map(addOnId => {
                                const addOn = ADD_ONS.find(a => a.id === addOnId);
                                return addOn ? (
                                    <div key={addOnId} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600 truncate pr-2">+ {addOn.name}:</span>
                                        <span className="text-gray-900 font-medium">${addOn.price}</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                            <span className="text-gray-600 font-medium text-sm">Total:</span>
                            <span className="text-2xl font-bold text-gray-900">${totalPrice}</span>
                        </div>
                    </div>
                )}

                {/* Select Date */}
                <div className="mb-3">
                    <label className="block font-semibold text-gray-900 mb-2 text-sm">Select Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                    />
                </div>

                {/* Select Time */}
                <div className="mb-3">
                    <label className="block font-semibold text-gray-900 mb-2 text-sm">Select Time</label>
                    {availableTimesForSelectedDate.length === 0 ? (
                        <div className="p-3 bg-gray-100 border-2 border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 font-medium text-sm">
                                {selectedDate ? 'Closed - No availability on this day' : 'Please select a date first'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                            {availableTimesForSelectedDate.map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`px-3 py-2 border-2 rounded-lg font-medium transition-all text-sm ${selectedTime === time ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-300'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Book Button */}
                <button
                    onClick={onBookNow || handleBookNow}
                    disabled={isBooking || !selectedPackage || !selectedTime || !selectedDate}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isBooking
                        ? 'Booking...'
                        : !selectedPackage
                            ? 'Select Package'
                            : `Book ${selectedPackage.name}`
                    }
                </button>
            </div>

            {/* Payment Modal */}
            {showPayment && bookingData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <PaymentForm
                        amount={bookingData.price}
                        serviceAddress={bookingData.address}
                        onClose={() => {
                            setShowPayment(false);
                            setBookingData(null);
                        }}
                        onComplete={handlePaymentComplete}
                    />
                </div>
            )}

            {/* Support */}
            <button onClick={handleSupport} className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Need help? Contact Brnno Support
            </button>
        </div>
    );
}

