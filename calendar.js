const { google } = require('googleapis');

async function getCalendars(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarList = await calendar.calendarList.list();
    const items = [];
    for (const cal of calendarList.data.items) {
        let eventLabels = [];
        try {
            const calRes = await calendar.calendars.get({ calendarId: cal.id });
            if (calRes.data.labelProperties?.eventLabels) {
                eventLabels = calRes.data.labelProperties.eventLabels;
            }
        } catch (e) {}
        items.push({
            id: cal.id,
            summary: cal.summary,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            primary: cal.primary || false,
            accessRole: cal.accessRole,
            eventLabels
        });
    }
    return items;
}

async function listEvents(auth, timeMin, timeMax, selectedCalendarIds = null) {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // First, list all calendars to get their colors
    const calendarList = await calendar.calendarList.list();
    let calendars = calendarList.data.items;

    if (selectedCalendarIds && Array.isArray(selectedCalendarIds)) {
        calendars = calendars.filter(cal => selectedCalendarIds.includes(cal.id));
    }

    const allEvents = [];
    
    for (const cal of calendars) {
        const res = await calendar.events.list({
            calendarId: cal.id,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            eventLabelVersion: 1
        });
        
        const events = res.data.items.map(event => ({
            ...event,
            calendarId: cal.id,
            calendarName: cal.summary,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            accessRole: cal.accessRole
        }));
        
        allEvents.push(...events);
    }

    return allEvents;
}

async function createEvent(auth, event) {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        eventLabelVersion: 1
    });
    return res.data;
}

async function updateEvent(auth, calendarId, eventId, event) {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.update({
        calendarId: calendarId || 'primary',
        eventId: eventId,
        resource: event,
        eventLabelVersion: 1
    });
    return res.data;
}

async function deleteEvent(auth, calendarId, eventId) {
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
        calendarId: calendarId || 'primary',
        eventId: eventId,
    });
}

module.exports = { getCalendars, listEvents, createEvent, updateEvent, deleteEvent };
