import React, { useState, useMemo } from 'react';
import { Calendar, Clock, MapPin, X } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { generateAvailableTimesForDate } from '../../utils';

export default function UpcomingAppointments({ appointments, onRefresh }) {
    const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    // Calculate available times for reschedule date
    const availableRescheduleTimes = useMemo(() => {
        if (!rescheduleDate || !rescheduleAppointment?.providerData) {
            return [];
        }
        const providerData = rescheduleAppointment.providerData;
        if (providerData.defaultAvailability) {
            return generateAvailableTimesForDate(
                providerData.defaultAvailability,
                providerData.dateOverrides || {},
                rescheduleDate
            );
        }
        return [];
    }, [rescheduleDate, rescheduleAppointment]);

    function handleOpenReschedule(apt) {
        // Convert displayed date back to YYYY-MM-DD format
        let dateValue = '';
        if (apt.dateRaw) {
            // If dateRaw is a Firestore timestamp
            if (apt.dateRaw.seconds !== undefined) {
                const date = new Date(apt.dateRaw.seconds * 1000);
                dateValue = date.toISOString().split('T')[0];
            } else if (apt.dateRaw.toDate && typeof apt.dateRaw.toDate === 'function') {
                // Firestore Timestamp object
                const date = apt.dateRaw.toDate();
                dateValue = date.toISOString().split('T')[0];
            } else if (apt.dateRaw instanceof Date) {
                dateValue = apt.dateRaw.toISOString().split('T')[0];
            } else if (typeof apt.dateRaw === 'string') {
                // Already in YYYY-MM-DD format
                dateValue = apt.dateRaw;
            } else {
                // Try to parse as date
                const date = new Date(apt.dateRaw);
                if (!isNaN(date.getTime())) {
                    dateValue = date.toISOString().split('T')[0];
                }
            }
        }
        setRescheduleAppointment(apt);
        setRescheduleDate(dateValue);
        setRescheduleTime('');
    }

    async function handleReschedule() {
        if (!rescheduleAppointment) return;

        if (!rescheduleDate) {
            alert('Please select a date');
            return;
        }

        if (!rescheduleTime) {
            alert('Please select a time');
            return;
        }

        setIsRescheduling(true);
        try {
            // Store date as string (YYYY-MM-DD) to match how bookings are originally created
            await updateDoc(doc(db, 'bookings', rescheduleAppointment.id), {
                date: rescheduleDate,
                time: rescheduleTime,
                updatedAt: serverTimestamp(),
                rescheduledAt: serverTimestamp()
            });

            // Notify provider if notification function exists
            if (rescheduleAppointment.providerUserId) {
                try {
                    const bookingData = {
                        id: rescheduleAppointment.id,
                        date: rescheduleDate,
                        time: rescheduleTime,
                        customerName: rescheduleAppointment.detailerName
                    };
                    // You can add a notifyBookingRescheduled function if needed
                } catch (notifError) {
                    console.warn('Failed to notify provider:', notifError);
                }
            }

            alert('Appointment rescheduled successfully!');
            setRescheduleAppointment(null);
            setRescheduleDate('');
            setRescheduleTime('');
            onRefresh();
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            alert('Failed to reschedule appointment. Please try again.');
        } finally {
            setIsRescheduling(false);
        }
    }

    async function handleCancelBooking(appointmentId) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            await updateDoc(doc(db, 'bookings', appointmentId), {
                status: 'cancelled',
                cancelledAt: serverTimestamp()
            });
            alert('Appointment cancelled successfully');
            onRefresh();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            alert('Failed to cancel appointment');
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Upcoming Appointments</h2>
                <button
                    onClick={onRefresh}
                    className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            {appointments.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming appointments</h3>
                    <p className="text-gray-600 mb-4">Book a detailing service to get started</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                        Browse Detailers
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{apt.detailerName}</h3>
                                    <p className="text-gray-600">{apt.service}</p>
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">${apt.price}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{apt.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{apt.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{apt.address}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                    onClick={() => handleOpenReschedule(apt)}
                                >
                                    Reschedule
                                </button>
                                <button
                                    onClick={() => handleCancelBooking(apt.id)}
                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleAppointment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Reschedule Appointment</h3>
                            <button
                                onClick={() => {
                                    setRescheduleAppointment(null);
                                    setRescheduleDate('');
                                    setRescheduleTime('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Current Appointment</p>
                            <p className="font-semibold text-gray-900">{rescheduleAppointment.detailerName}</p>
                            <p className="text-sm text-gray-600">{rescheduleAppointment.service}</p>
                            <p className="text-sm text-gray-600 mt-2">
                                {rescheduleAppointment.date} at {rescheduleAppointment.time}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block font-semibold text-gray-900 mb-2 text-sm">Select New Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => {
                                        setRescheduleDate(e.target.value);
                                        setRescheduleTime(''); // Clear time when date changes
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-900 mb-2 text-sm">Select New Time</label>
                                {availableRescheduleTimes.length === 0 ? (
                                    <div className="p-3 bg-gray-100 border-2 border-gray-200 rounded-lg text-center">
                                        <p className="text-gray-600 font-medium text-sm">
                                            {rescheduleDate ? 'No availability on this day' : 'Please select a date first'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {availableRescheduleTimes.map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => setRescheduleTime(time)}
                                                className={`px-3 py-2 border-2 rounded-lg font-medium transition-all text-sm ${rescheduleTime === time
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 text-gray-700 hover:border-blue-300'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setRescheduleAppointment(null);
                                        setRescheduleDate('');
                                        setRescheduleTime('');
                                    }}
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                    disabled={isRescheduling}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    disabled={isRescheduling || !rescheduleDate || !rescheduleTime}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

