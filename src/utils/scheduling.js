// Generate available time slots based on provider's schedule for a specific date
export function generateAvailableTimesForDate(defaultAvailability, dateOverrides, selectedDate) {
    if (!selectedDate || !defaultAvailability) {
        return [];
    }

    const date = new Date(selectedDate + 'T00:00:00'); // ensure local timezone
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const dateString = selectedDate; // YYYY-MM-DD

    // Check overrides
    if (dateOverrides && dateOverrides[dateString]) {
        const override = dateOverrides[dateString];
        if (override.type === 'unavailable') {
            return [];
        }
        if (override.type === 'custom' && override.hours) {
            return generateTimeSlots(override.hours.start, override.hours.end);
        }
    }

    const daySchedule = defaultAvailability[dayOfWeek];

    if (!daySchedule) {
        return [];
    }

    if (!daySchedule.enabled) {
        return [];
    }

    // Ensure start and end times exist, use defaults if missing
    const startTime = daySchedule.start || '09:00';
    const endTime = daySchedule.end || '17:00';

    return generateTimeSlots(startTime, endTime);
}

// Generate time slots in 1-hour increments (e.g., 09:00-14:00)
export function generateTimeSlots(startTime, endTime) {
    if (!startTime || !endTime) return [];
    const slots = [];
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    for (let hour = startHour; hour < endHour; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        slots.push(`${displayHour}:00 ${period}`);
    }
    return slots;
}

// Get provider's general hours (for display on cards)
export function getProviderHours(defaultAvailability) {
    if (!defaultAvailability) return 'Hours vary';
    const monday = defaultAvailability.monday;
    if (monday && monday.enabled) {
        const start = formatTime(monday.start);
        const end = formatTime(monday.end);
        return `${start} - ${end}`;
    }
    return 'Hours vary';
}

// Format 24hr time to 12hr (10:00 → 10:00 AM)
export function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${period}`;
}

// Check if a date is available (not blocked)
export function isDateAvailable(dateOverrides, dateString) {
    if (!dateOverrides || !dateString) return true;
    const override = dateOverrides[dateString];
    if (override && override.type === 'unavailable') return false;
    return true;
}

