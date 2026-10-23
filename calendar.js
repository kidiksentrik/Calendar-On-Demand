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
        } catch (_e) {}
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

// ── Google Tasks API v1 Integration ─────────────────────────────────────────

async function getTaskLists(auth) {
    const tasksApi = google.tasks({ version: 'v1', auth });
    const res = await tasksApi.tasklists.list({ maxResults: 50 });
    const items = res.data.items || [];
    return items.map(list => ({
        id: list.id,
        title: list.title
    }));
}

async function listGoogleTasks(auth, tasklistId = '@default') {
    const tasksApi = google.tasks({ version: 'v1', auth });
    const res = await tasksApi.tasks.list({
        tasklist: tasklistId || '@default',
        showCompleted: true,
        showHidden: true,
        maxResults: 100
    });
    const items = res.data.items || [];
    // Filter out empty-title deleted/placeholder items that Google Tasks sometimes returns
    return items
        .filter(item => item.title && item.title.trim().length > 0 && !item.deleted)
        .map(item => ({
            id: item.id,
            title: item.title,
            notes: item.notes || '',
            status: item.status === 'completed' ? 'completed' : 'needsAction',
            due: item.due || null,
            updated: item.updated || null,
            position: item.position || '',
            source: 'google',
            tasklistId: tasklistId || '@default'
        }));
}

async function createGoogleTask(auth, tasklistId = '@default', taskData = {}) {
    const tasksApi = google.tasks({ version: 'v1', auth });
    const requestBody = {
        title: taskData.title,
        notes: taskData.notes || '',
        status: taskData.status || 'needsAction'
    };
    if (taskData.due) requestBody.due = taskData.due;

    const res = await tasksApi.tasks.insert({
        tasklist: tasklistId || '@default',
        requestBody
    });
    const item = res.data;
    return {
        id: item.id,
        title: item.title,
        notes: item.notes || '',
        status: item.status === 'completed' ? 'completed' : 'needsAction',
        due: item.due || null,
        updated: item.updated || null,
        position: item.position || '',
        source: 'google',
        tasklistId: tasklistId || '@default'
    };
}

async function updateGoogleTask(auth, tasklistId = '@default', taskId, patchData = {}) {
    const tasksApi = google.tasks({ version: 'v1', auth });
    const requestBody = { ...patchData };
    if (requestBody.status === 'needsAction') {
        requestBody.completed = null;
    }
    const res = await tasksApi.tasks.patch({
        tasklist: tasklistId || '@default',
        task: taskId,
        requestBody
    });
    return res.data;
}

async function deleteGoogleTask(auth, tasklistId = '@default', taskId) {
    const tasksApi = google.tasks({ version: 'v1', auth });
    await tasksApi.tasks.delete({
        tasklist: tasklistId || '@default',
        task: taskId
    });
    return true;
}

async function clearCompletedGoogleTasks(auth, tasklistId = '@default') {
    const tasksApi = google.tasks({ version: 'v1', auth });
    await tasksApi.tasks.clear({
        tasklist: tasklistId || '@default'
    });
    return true;
}

module.exports = {
    getCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getTaskLists,
    listGoogleTasks,
    createGoogleTask,
    updateGoogleTask,
    deleteGoogleTask,
    clearCompletedGoogleTasks
};
