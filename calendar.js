const { google } = require('googleapis');

async function listEvents(auth, timeMin, timeMax) {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // First, list all calendars to get their colors
    const calendarList = await calendar.calendarList.list();
    const calendars = calendarList.data.items;

    const allEvents = [];
    
    for (const cal of calendars) {
        const res = await calendar.events.list({
            calendarId: cal.id,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const events = res.data.items.map(event => ({
            ...event,
            calendarId: cal.id,
            calendarName: cal.summary,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor
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
    });
    return res.data;
}

async function updateEvent(auth, calendarId, eventId, event) {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.update({
        calendarId: calendarId || 'primary',
        eventId: eventId,
        resource: event,
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

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };
