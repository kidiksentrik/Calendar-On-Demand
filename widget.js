try {
    const { ipcRenderer, shell } = require('electron');

    let currentViewDate = new Date();
    let events = [];
    let selectedDay = null;
    let startOfWeek = 0;
    let editingEvent = null;
    let allCalendars = [];
    let selectedCalendarIds = null;

    try {
        const savedIds = localStorage.getItem('selectedCalendarIds');
        if (savedIds) {
            selectedCalendarIds = JSON.parse(savedIds);
        }
    } catch(e) {}

    let lastSyncTime = 0;
    let syncTimer = null;
    let errorCount = 0;
    const NORMAL_SYNC_INTERVAL = 900000; // 15 minutes
    const BACKOFF_DELAYS = [60000, 120000, 240000, 900000]; // 1m, 2m, 4m, 15m

    function scheduleNextSync(delay) {
        if (syncTimer) {
            clearTimeout(syncTimer);
        }
        syncTimer = setTimeout(fetchEvents, delay);
    }

    // Synthesize clean audio chimes programmatically
    function playChimeSound(isCompleted) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            if (isCompleted) {
                // Happy double-chime for task completion (e.g. C5 -> A5)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                const now = ctx.currentTime;
                
                // Play first note (523Hz)
                osc.frequency.setValueAtTime(523.25, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                // Play second note (880Hz)
                osc.frequency.setValueAtTime(880.00, now + 0.08);
                gain.gain.setValueAtTime(0.15, now + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                
                osc.start(now);
                osc.stop(now + 0.4);
            } else {
                // Lower drop note for unchecking task
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                const now = ctx.currentTime;
                
                osc.frequency.setValueAtTime(329.63, now);
                osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.15);
                
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                
                osc.start(now);
                osc.stop(now + 0.16);
            }
        } catch (e) {
            console.warn('Audio feedback failed to play:', e);
        }
    }

    function stripTags(summary) {
        if (!summary) return '';
        return summary
            .replace(/^\[[x ]\]\s*/, '') // Remove [x] or [ ] prefixes
            .replace(/\[HIGHLIGHT\]/g, '')
            .replace(/\[IMPORTANT\]/g, '')
            .replace(/\[COLOR:#[0-9a-fA-F]{3,6}\]/g, '')
            .trim();
    }

    // DOM Elements
    const calendarDays = document.getElementById('calendar-days');
    const calendarHeader = document.querySelector('.calendar-grid-header');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const homeBtn = document.getElementById('home-btn');
    const syncBtn = document.getElementById('sync-btn');
    const lockBtn = document.getElementById('lock-btn');
    const quickAddModal = document.getElementById('quick-add-modal');
    const quickAddInput = document.getElementById('quick-add-input');
    const allDayCheck = document.getElementById('all-day-check');
    const eventLocationInput = document.getElementById('event-location');
    const eventDescriptionInput = document.getElementById('event-description');
    const extraFields = document.getElementById('extra-fields');
    const toggleExtraBtn = document.getElementById('toggle-extra');
    const syncIndicator = document.getElementById('sync-indicator');
    const eventPopup = document.getElementById('event-popup');
    const saveEventBtn = document.getElementById('save-event');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsOverlay = document.getElementById('settings-overlay');
    const opacitySlider = document.getElementById('opacity-slider');
    const alwaysOnTopCheck = document.getElementById('always-on-top-check');
    const lockPositionCheck = document.getElementById('lock-position-check');
    const desktopModeCheck = document.getElementById('desktop-mode-check');
    const startupCheck = document.getElementById('startup-check');
    const startOfWeekSelect = document.getElementById('start-of-week-select');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorPicker = document.getElementById('text-color-picker');
    const accentColorPicker = document.getElementById('accent-color-picker');
    const resetSettingsBtn = document.getElementById('reset-settings');
    const closeSettings = document.getElementById('close-settings');
    const closePopupBtn = document.getElementById('close-popup');
    const reauthBtn = document.getElementById('reauth-btn');
    const appVersionLabel = document.getElementById('settings-app-version');

    // New Todo list container
    const todoListContainer = document.getElementById('todo-list-container');
    const todoDateTitle = document.getElementById('todo-date-title');

    if (reauthBtn) reauthBtn.onclick = () => ipcRenderer.invoke('reset-auth');

    document.querySelectorAll('.color-opt').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (document.getElementById('selected-entry-color')) {
                document.getElementById('selected-entry-color').value = btn.getAttribute('data-color');
            }
        };
    });


    const defaultTheme = {
        'bg-base': '#0f0f14',
        'text-color': '#e8e8e8',
        'accent-color': '#4f8ef7',
        'bg-opacity': 0.92
    };

    function applyTheme(theme) {
        if (!theme) return;
        Object.keys(theme).forEach(key => {
            const val = theme[key];
            if (val !== undefined && val !== null) {
                document.documentElement.style.setProperty(`--${key}`, val);
                const picker = document.getElementById(`${key}-picker`);
                if (picker) picker.value = val;
                if (key === 'bg-opacity' && opacitySlider) opacitySlider.value = val;
            }
        });
    }


    function getLocalTZOffset() {
        const tzOffset = -new Date().getTimezoneOffset();
        const diff = tzOffset >= 0 ? '+' : '-';
        const pad = (n) => n.toString().padStart(2, '0');
        return diff + pad(Math.floor(Math.abs(tzOffset) / 60)) + ':' + pad(Math.abs(tzOffset) % 60);
    }

    function renderCalendar() {
        if (!calendarDays || !calendarHeader) return;
        calendarDays.innerHTML = '';
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        if (currentMonthYear) currentMonthYear.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentViewDate);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const displayDays = startOfWeek === 0 ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        calendarHeader.innerHTML = displayDays.map(d => `<span>${d}</span>`).join('');

        let firstDay = new Date(year, month, 1).getDay(); 
        if (startOfWeek === 1) firstDay = (firstDay === 0 ? 6 : firstDay - 1);

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDaysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();

        for (let i = firstDay; i > 0; i--) addDayCell(year, month - 1, prevDaysInMonth - i + 1, true);
        for (let d = 1; d <= daysInMonth; d++) addDayCell(year, month, d, false, (today.getDate() === d && today.getMonth() === month && today.getFullYear() === year));
        const totalCells = 42;
        const remainingCells = totalCells - calendarDays.children.length;
        for (let d = 1; d <= remainingCells; d++) addDayCell(year, month + 1, d, true);
    }

    function addDayCell(year, month, day, isOtherMonth, isToday) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay();
        const y = dateObj.getFullYear(), m = (dateObj.getMonth() + 1).toString().padStart(2, '0'), d = dateObj.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const cell = document.createElement('div');
        cell.classList.add('day-cell');
        if (isOtherMonth) cell.classList.add('other-month');
        if (isToday) cell.classList.add('today');
        if (dayOfWeek === 0) cell.classList.add('sunday');
        if (dayOfWeek === 6) cell.classList.add('saturday');
        if (dayOfWeek === 0 || dayOfWeek === 6) cell.classList.add('weekend');

        
        cell.innerHTML = `<span class="day-number">${day}</span><div class="events-container"></div>`;

        
        const dayEvents = events.filter(e => {
            const start = e.start.dateTime || e.start.date;
            return start.startsWith(dateStr);
        });

        const eventsContainer = cell.querySelector('.events-container');
        let cellHighlightColor = null;

        // Pre-scan for highlight tag to determine if the whole cell should be colored
        dayEvents.forEach(e => {
            if (e.summary.includes('[HIGHLIGHT]')) {
                cellHighlightColor = e.backgroundColor || 'var(--accent-color)';
                const colorMatch = e.summary.match(/\[COLOR:(#[0-9a-fA-F]{3,6})\]/);
                if (colorMatch) cellHighlightColor = colorMatch[1];
            }
        });

        dayEvents.slice(0, 3).forEach(e => {
            const ev = document.createElement('div');
            ev.classList.add('event-item');
            
            // Check if completed
            const isCompleted = e.summary.startsWith('[x]');
            if (isCompleted) {
                ev.classList.add('completed-event');
            }

            let displaySummary = e.summary;
            if (displaySummary.includes('[IMPORTANT]')) {
                ev.classList.add('important-event');
                displaySummary = displaySummary.replace('[IMPORTANT]', '⭐');
            }
            
            if (displaySummary.includes('[HIGHLIGHT]')) {
                displaySummary = displaySummary.replace('[HIGHLIGHT]', '');
            }

            const colorMatch = displaySummary.match(/\[COLOR:(#[0-9a-fA-F]{3,6})\]/);
            if (colorMatch) {
                // If the whole cell is highlighted, we keep the event item background transparent
                if (!cellHighlightColor) {
                    ev.style.background = colorMatch[1];
                    ev.style.color = '#000';
                }
                displaySummary = displaySummary.replace(colorMatch[0], '');
            }
            
            ev.innerText = stripTags(displaySummary);
            ev.style.borderLeft = `3px solid ${e.backgroundColor || 'var(--accent-color)'}`;
            ev.onclick = (event) => { 
                event.stopPropagation(); 
                editingEvent = null; 
                selectedDay = dateStr; 
                openQuickAdd(); 
                
                // Automatically trigger the edit mode for this specific clicked event
                const todoItems = document.querySelectorAll('.todo-title');
                todoItems.forEach(item => {
                    if (item.title === e.summary) {
                        item.click();
                    }
                });
            };
            eventsContainer.appendChild(ev);
        });

        if (cellHighlightColor) {
            cell.style.background = `linear-gradient(135deg, ${cellHighlightColor}33 0%, ${cellHighlightColor}11 100%)`;
            cell.style.borderColor = cellHighlightColor;
        }

        cell.onclick = () => { 
            editingEvent = null; 
            selectedDay = dateStr; 
            openQuickAdd(); 
        };
        calendarDays.appendChild(cell);
    }

    async function fetchEvents() {
        if (syncTimer) {
            clearTimeout(syncTimer);
            syncTimer = null;
        }

        if (syncIndicator) {
            syncIndicator.innerText = 'Syncing...';
            syncIndicator.classList.remove('hidden', 'error');
        }
        
        const timeMin = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1).toISOString();
        const timeMax = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 2, 0).toISOString();
        
        try {
            events = await ipcRenderer.invoke('get-events', { 
                timeMin, 
                timeMax, 
                selectedCalendarIds 
            });
            lastSyncTime = Date.now();
            errorCount = 0;
            if (syncIndicator) {
                syncIndicator.classList.add('hidden');
                syncIndicator.onclick = null;
                syncIndicator.style.cursor = 'default';
            }
            scheduleNextSync(NORMAL_SYNC_INTERVAL);
        } catch (err) { 
            console.error('Fetch error:', err);
            if (syncIndicator) {
                syncIndicator.innerText = 'Sync Failed (Click to login)';
                syncIndicator.classList.add('error');
                syncIndicator.classList.remove('hidden');
                syncIndicator.style.cursor = 'pointer';
                syncIndicator.onclick = () => ipcRenderer.invoke('reset-auth');
            }
            
            const delay = BACKOFF_DELAYS[Math.min(errorCount, BACKOFF_DELAYS.length - 1)];
            errorCount++;
            console.log(`Sync failed. Retrying in ${delay / 1000} seconds...`);
            scheduleNextSync(delay);
        } finally {
            renderCalendar();
            // Refresh todo modal if it is currently open
            if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                updateTodoListUI();
            }
        }
    }

    function openQuickAdd() {
        if (quickAddModal) quickAddModal.classList.remove('hidden');
        if (todoDateTitle) {
            const dateParts = selectedDay.split('-');
            const formattedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
                .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            todoDateTitle.innerText = formattedDate;
        }
        
        updateTodoListUI();

        if (quickAddInput) { quickAddInput.value = ''; quickAddInput.focus(); }
        if (allDayCheck) allDayCheck.checked = false;
        if (document.getElementById('important-check')) document.getElementById('important-check').checked = false;
        if (document.getElementById('highlight-cell-check')) document.getElementById('highlight-cell-check').checked = false;
        if (document.getElementById('selected-entry-color')) document.getElementById('selected-entry-color').value = 'default';
        document.querySelectorAll('.color-opt').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-opt[data-color="default"]')?.classList.add('active');
        if (extraFields) extraFields.classList.add('hidden');
        if (toggleExtraBtn) toggleExtraBtn.classList.remove('hidden');
    }

    function updateTodoListUI() {
        if (!todoListContainer) return;
        todoListContainer.innerHTML = '';

        // Filter events for the selected day
        const dayEvents = events.filter(e => {
            const start = e.start.dateTime || e.start.date;
            const isReadOnly = e.accessRole === 'reader' || e.accessRole === 'freeBusyReader';
            return start.startsWith(selectedDay) && !isReadOnly;
        });

        if (dayEvents.length === 0) {
            todoListContainer.innerHTML = `<div style="font-size: 0.85rem; opacity: 0.4; padding: 16px; text-align: center;">No tasks for this day.</div>`;
            return;
        }

        dayEvents.forEach(e => {
            const isCompleted = e.summary.startsWith('[x]');
            
            const item = document.createElement('div');
            item.classList.add('todo-item');

            const itemLeft = document.createElement('div');
            itemLeft.classList.add('todo-item-left');

            const checkbox = document.createElement('div');
            checkbox.className = `todo-checkbox ${isCompleted ? 'checked' : ''}`;
            checkbox.onclick = (event) => {
                event.stopPropagation();
                toggleTodoStatus(e);
            };
            itemLeft.appendChild(checkbox);

            const title = document.createElement('span');
            title.className = `todo-title ${isCompleted ? 'completed' : ''}`;
            title.innerText = stripTags(e.summary);
            title.title = e.summary;
            
            title.onclick = (event) => {
                event.stopPropagation();
                editingEvent = e;
                
                // Populate text input
                if (quickAddInput) {
                    quickAddInput.value = stripTags(e.summary);
                    quickAddInput.focus();
                }
                
                // Populate extra options
                if (eventLocationInput) eventLocationInput.value = e.location || '';
                if (eventDescriptionInput) eventDescriptionInput.value = e.description || '';
                if (allDayCheck) allDayCheck.checked = !!e.start.date;
                if (document.getElementById('important-check')) document.getElementById('important-check').checked = e.summary.includes('[IMPORTANT]');
                if (document.getElementById('highlight-cell-check')) document.getElementById('highlight-cell-check').checked = e.summary.includes('[HIGHLIGHT]');
                
                // Populate color selection
                const colorMatch = e.summary.match(/\[COLOR:(#[0-9a-fA-F]{3,6})\]/);
                const selectedColor = colorMatch ? colorMatch[1] : 'default';
                if (document.getElementById('selected-entry-color')) document.getElementById('selected-entry-color').value = selectedColor;
                document.querySelectorAll('.color-opt').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-color') === selectedColor);
                });

                // Auto-show More Options when editing
                if (extraFields) extraFields.classList.remove('hidden');
                if (toggleExtraBtn) toggleExtraBtn.classList.add('hidden');
            };

            itemLeft.appendChild(title);

            // Meeting join button (Google Meet or other conference link)
            const meetUrl = e.hangoutLink ||
                e.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri;
            if (meetUrl) {
                const joinBtn = document.createElement('button');
                joinBtn.className = 'todo-join-btn';
                joinBtn.innerText = '📹 Join';
                joinBtn.title = `Join meeting: ${meetUrl}`;
                joinBtn.onclick = (event) => {
                    event.stopPropagation();
                    shell.openExternal(meetUrl);
                };
                itemLeft.appendChild(joinBtn);
            }

            item.appendChild(itemLeft);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('todo-delete-btn');
            deleteBtn.innerText = '✕';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = async (event) => {
                event.stopPropagation();
                item.style.opacity = '0.3';
                // Clear input and editingEvent immediately so that clicking outside
                // after deletion does NOT trigger saveCurrentEvent() and recreate the entry.
                if (quickAddInput) quickAddInput.value = '';
                editingEvent = null;
                await ipcRenderer.invoke('delete-event', { calendarId: e.calendarId, eventId: e.id });
                fetchEvents();
            };
            item.appendChild(deleteBtn);

            todoListContainer.appendChild(item);
        });
    }

    async function toggleTodoStatus(eventItem) {
        const isCompleted = eventItem.summary.startsWith('[x]');
        let newSummary = eventItem.summary;
        if (isCompleted) {
            newSummary = eventItem.summary.replace(/^\[x\]\s*/, '');
        } else {
            newSummary = '[x] ' + eventItem.summary.replace(/^\[ \]\s*/, '');
        }

        // 1. Play immediate sound feedback (Clean 8bit chime synthezised on the fly)
        playChimeSound(!isCompleted);

        // 2. Perform Optimistic UI Update locally
        eventItem.summary = newSummary; // Mutate local state directly for 0ms delay
        updateTodoListUI();
        renderCalendar();
        
        const eventData = {
            summary: newSummary,
            start: eventItem.start,
            end: eventItem.end,
            location: eventItem.location,
            description: eventItem.description
        };

        try {
            await ipcRenderer.invoke('update-event', { 
                calendarId: eventItem.calendarId, 
                eventId: eventItem.id, 
                eventData 
            });
            fetchEvents(); // Background sync to ensure data is correct
        } catch (err) {
            console.error('Failed to toggle todo status:', err);
            // Revert changes if API fails
            fetchEvents();
        }
    }


    async function saveCurrentEvent() {
        const summary = quickAddInput ? stripTags(quickAddInput.value) : '';
        if (!summary) return;
        
        let startStr = null, endStr = null;
        const durationMatch = summary.match(/(\d{1,2}:?\d{2})\s*[-~to]\s*(\d{1,2}:?\d{2})/);
        const singleTimeMatch = summary.match(/(\d{1,2}:?\d{2})/);
        function formatPart(t) {
            if (t.includes(':')) return t;
            if (t.length === 3) return `0${t[0]}:${t.slice(1)}`;
            if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`;
            return t;
        }
        if (durationMatch) { startStr = formatPart(durationMatch[1]); endStr = formatPart(durationMatch[2]); }
        else if (singleTimeMatch) { startStr = formatPart(singleTimeMatch[0]); }

        const offset = getLocalTZOffset();
        let start = { date: selectedDay }, end = { date: selectedDay };
        const isAllDayState = allDayCheck ? allDayCheck.checked : (!startStr);

        if (!isAllDayState && startStr) {
            start = { dateTime: `${selectedDay}T${startStr}:00${offset}` };
            if (endStr) end = { dateTime: `${selectedDay}T${endStr}:00${offset}` };
            else { const [h, m] = startStr.split(':').map(Number); const endHour = (h + 1).toString().padStart(2, '0'); end = { dateTime: `${selectedDay}T${endHour}:${m.toString().padStart(2, '0')}:00${offset}` }; }
        } else {
            const nextDay = new Date(selectedDay); nextDay.setDate(nextDay.getDate() + 1);
            end = { date: `${nextDay.getFullYear()}-${(nextDay.getMonth() + 1).toString().padStart(2, '0')}-${nextDay.getDate().toString().padStart(2, '0')}` };
        }

        const location = eventLocationInput ? eventLocationInput.value : '';
        const description = eventDescriptionInput ? eventDescriptionInput.value : '';
        const isImportant = document.getElementById('important-check')?.checked;
        const isHighlighted = document.getElementById('highlight-cell-check')?.checked;
        const entryColor = document.getElementById('selected-entry-color')?.value;
        
        let finalSummary = summary;
        
        // Preserve [x] prefix if it was previously completed
        if (editingEvent && editingEvent.summary.startsWith('[x]')) {
            finalSummary = '[x] ' + finalSummary;
        }
        
        if (isImportant) finalSummary += ' [IMPORTANT]';
        if (isHighlighted) finalSummary += ' [HIGHLIGHT]';
        if (entryColor && entryColor !== 'default') finalSummary += ` [COLOR:${entryColor}]`;
        
        const eventData = { 
            summary: finalSummary, 
            start, 
            end, 
            location, 
            description 
        };

        // Preserve editing event copy
        const currentEditEvent = editingEvent;

        // Reset inputs immediately for responsive UX
        quickAddInput.value = '';
        if (eventLocationInput) eventLocationInput.value = '';
        if (eventDescriptionInput) eventDescriptionInput.value = '';
        if (allDayCheck) allDayCheck.checked = false;
        if (document.getElementById('important-check')) document.getElementById('important-check').checked = false;
        if (document.getElementById('highlight-cell-check')) document.getElementById('highlight-cell-check').checked = false;
        if (document.getElementById('selected-entry-color')) document.getElementById('selected-entry-color').value = 'default';
        document.querySelectorAll('.color-opt').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-opt[data-color="default"]')?.classList.add('active');
        editingEvent = null;

        try {
            if (currentEditEvent) {
                await ipcRenderer.invoke('update-event', { 
                    calendarId: currentEditEvent.calendarId, 
                    eventId: currentEditEvent.id, 
                    eventData 
                });
            } else {
                await ipcRenderer.invoke('create-event', eventData);
            }
        } catch (err) {
            console.error('Failed to save event:', err);
        }
        
        fetchEvents();
    }

    if (quickAddInput) {
        quickAddInput.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                await saveCurrentEvent();
            } else if (e.key === 'Escape') {
                closeAllModals();
            }
        };
    }

    if (saveEventBtn) {
        saveEventBtn.onclick = async () => {
            await saveCurrentEvent();
        };
    }

    function showEventDetails(event) {
        editingEvent = event;
        const titleEl = document.getElementById('popup-title'), timeEl = document.getElementById('popup-time'), calEl = document.getElementById('popup-calendar'), calColorEl = document.getElementById('popup-calendar-color'), descEl = document.getElementById('popup-description');
        if (titleEl) titleEl.innerText = stripTags(event.summary);
        const start = new Date(event.start.dateTime || event.start.date), end = new Date(event.end.dateTime || event.end.date);
        let timeStr = start.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (event.end && (event.end.dateTime || event.end.date)) { if (!event.start.date) timeStr += ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; else timeStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' (All Day)'; }
        if (timeEl) timeEl.innerText = timeStr;
        if (calEl) calEl.innerText = event.calendarName || '';
        if (calColorEl) calColorEl.style.backgroundColor = event.backgroundColor || 'var(--accent-color)';

        if (descEl) {
            let description = event.description || '';
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = description;
            
            const existingLinks = tempDiv.querySelectorAll('a');
            existingLinks.forEach(a => { 
                const url = a.href; 
                a.style.cursor = 'pointer'; 
                a.style.color = 'var(--accent-color)'; 
                a.setAttribute('onclick', `require('electron').shell.openExternal('${url}'); return false;`);
                a.removeAttribute('href'); 
            });

            if (existingLinks.length === 0) {
                let text = tempDiv.innerText; const urlRegex = /(https?:\/\/[^\s]+)/g;
                descEl.innerHTML = text.replace(urlRegex, (u) => { 
                    const c = u.replace(/["'>]$/, ''); 
                    return `<a href="#" style="color: var(--accent-color); cursor: pointer;" onclick="require('electron').shell.openExternal('${c}'); return false;">${c}</a>`; 
                }).replace(/\n/g, '<br>');
            } else {
                descEl.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
            }
        }

        const editBtn = document.getElementById('edit-event'), deleteBtn = document.getElementById('delete-event');
        if (editBtn) {
            editBtn.onclick = () => {
                if (eventPopup) eventPopup.classList.add('hidden');
                editingEvent = event;
                if (quickAddInput) quickAddInput.value = stripTags(event.summary);
                if (eventLocationInput) eventLocationInput.value = event.location || '';
                if (eventDescriptionInput) eventDescriptionInput.value = event.description || '';
                if (allDayCheck) allDayCheck.checked = !!event.start.date;
                if (document.getElementById('important-check')) document.getElementById('important-check').checked = event.summary.includes('[IMPORTANT]');
                if (document.getElementById('highlight-cell-check')) document.getElementById('highlight-cell-check').checked = event.summary.includes('[HIGHLIGHT]');
                
                const colorMatch = event.summary.match(/\[COLOR:(#[0-9a-fA-F]{3,6})\]/);
                const selectedColor = colorMatch ? colorMatch[1] : 'default';
                if (document.getElementById('selected-entry-color')) document.getElementById('selected-entry-color').value = selectedColor;
                document.querySelectorAll('.color-opt').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-color') === selectedColor);
                });

                if (extraFields) extraFields.classList.remove('hidden');
                if (toggleExtraBtn) toggleExtraBtn.classList.add('hidden');

                selectedDay = (event.start.dateTime || event.start.date).split('T')[0];
                if (quickAddModal) quickAddModal.classList.remove('hidden');
                quickAddInput?.focus();
            };
        }

        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                await ipcRenderer.invoke('delete-event', { calendarId: event.calendarId, eventId: event.id });
                closeAllModals(); fetchEvents();
            };
        }
        if (eventPopup) eventPopup.classList.remove('hidden');
    }


    function closeAllModals() {
        if (quickAddModal) quickAddModal.classList.add('hidden');
        if (settingsOverlay) settingsOverlay.classList.add('hidden');
        if (eventPopup) eventPopup.classList.add('hidden');
        if (quickAddInput) quickAddInput.value = ''; 
        if (eventLocationInput) eventLocationInput.value = ''; 
        if (eventDescriptionInput) eventDescriptionInput.value = '';
        if (allDayCheck) allDayCheck.checked = false;
        if (document.getElementById('important-check')) document.getElementById('important-check').checked = false;
        if (document.getElementById('highlight-cell-check')) document.getElementById('highlight-cell-check').checked = false;
        if (document.getElementById('selected-entry-color')) document.getElementById('selected-entry-color').value = 'default';
        document.querySelectorAll('.color-opt').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.color-opt[data-color="default"]')?.classList.add('active');
        if (extraFields) extraFields.classList.add('hidden');
        if (toggleExtraBtn) toggleExtraBtn.classList.remove('hidden'); 
        editingEvent = null;
    }

    async function handleAutoSaveAndClose() {
        if (quickAddInput && quickAddInput.value.trim() !== '') {
            let shouldSave = true;
            if (editingEvent) {
                const currentText = stripTags(quickAddInput.value);
                const originalText = stripTags(editingEvent.summary);
                const currentLoc = eventLocationInput ? eventLocationInput.value : '';
                const originalLoc = editingEvent.location || '';
                const currentDesc = eventDescriptionInput ? eventDescriptionInput.value : '';
                const originalDesc = editingEvent.description || '';
                const currentImportant = document.getElementById('important-check')?.checked || false;
                const originalImportant = editingEvent.summary.includes('[IMPORTANT]');
                const currentHighlight = document.getElementById('highlight-cell-check')?.checked || false;
                const originalHighlight = editingEvent.summary.includes('[HIGHLIGHT]');
                
                const colorMatch = editingEvent.summary.match(/\[COLOR:(#[0-9a-fA-F]{3,6})\]/);
                const originalColor = colorMatch ? colorMatch[1] : 'default';
                const currentColor = document.getElementById('selected-entry-color')?.value || 'default';
                
                const currentAllDay = allDayCheck ? allDayCheck.checked : false;
                const originalAllDay = !!editingEvent.start.date;

                if (currentText === originalText && 
                    currentLoc === originalLoc && 
                    currentDesc === originalDesc && 
                    currentImportant === originalImportant && 
                    currentHighlight === originalHighlight && 
                    currentColor === originalColor &&
                    currentAllDay === originalAllDay) {
                    shouldSave = false;
                }
            }

            if (shouldSave) {
                await saveCurrentEvent();
            }
        }
        closeAllModals();
    }

    window.onclick = async (e) => { 
        if (e.target.classList.contains('modal')) {
            await handleAutoSaveAndClose(); 
        }
    };
    if (closePopupBtn) closePopupBtn.onclick = async () => await handleAutoSaveAndClose();
    if (prevMonthBtn) prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); fetchEvents(); };
    if (nextMonthBtn) nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); fetchEvents(); };
    if (homeBtn) homeBtn.onclick = () => { currentViewDate = new Date(); fetchEvents(); };
    if (syncBtn) syncBtn.onclick = () => fetchEvents();

    function updateLockUI(isLocked) {
        if (lockBtn) {
            lockBtn.style.opacity = isLocked ? '1' : '0.6';
            lockBtn.style.background = isLocked ? 'rgba(79, 142, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            lockBtn.style.borderColor = isLocked ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.1)';
        }
        if (lockPositionCheck) lockPositionCheck.checked = isLocked;
        document.body.classList.toggle('locked-mode', isLocked);
    }

    if (lockBtn) {
        lockBtn.onclick = () => {
            const isLocked = !document.body.classList.contains('locked-mode');
            ipcRenderer.send('set-lock-position', isLocked);
            updateLockUI(isLocked);
        };
    }

    if (settingsToggle) {
        settingsToggle.onclick = async () => {
            try {
                const settings = await ipcRenderer.invoke('get-settings');
                const startup = await ipcRenderer.invoke('get-login-settings');
                if (startupCheck) startupCheck.checked = startup ? startup.openAtLogin : false;
                if (alwaysOnTopCheck) alwaysOnTopCheck.checked = settings.alwaysOnTop || false;
                if (lockPositionCheck) lockPositionCheck.checked = settings.lockPosition || false;
                if (desktopModeCheck) desktopModeCheck.checked = settings.desktopMode || false;
                if (startOfWeekSelect) startOfWeekSelect.value = settings.startOfWeek || 0;
                
                // Fetch and render calendars
                try {
                    const cList = document.getElementById('calendars-list');
                    if (cList) {
                        cList.innerHTML = '<div style="font-size: 0.85rem; opacity: 0.5;">Loading...</div>';
                        allCalendars = await ipcRenderer.invoke('get-calendars');
                        cList.innerHTML = '';
                        
                        if (!selectedCalendarIds && allCalendars.length > 0) {
                            selectedCalendarIds = allCalendars.map(c => c.id);
                            localStorage.setItem('selectedCalendarIds', JSON.stringify(selectedCalendarIds));
                        }

                        allCalendars.forEach(cal => {
                            const item = document.createElement('div');
                            item.className = 'setting-item';
                            item.style.marginBottom = '8px';
                            
                            const isChecked = selectedCalendarIds ? selectedCalendarIds.includes(cal.id) : true;
                            
                            item.innerHTML = `
                                <label class="switch">
                                    <span style="display:flex; align-items:center; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <span class="calendar-item-color" style="background-color: ${cal.backgroundColor}"></span>
                                        ${cal.summary}
                                    </span>
                                    <input type="checkbox" value="${cal.id}" ${isChecked ? 'checked' : ''}>
                                    <span class="slider-toggle"></span>
                                </label>
                            `;
                            
                            const checkbox = item.querySelector('input');
                            checkbox.onchange = (e) => {
                                if (!selectedCalendarIds) selectedCalendarIds = allCalendars.map(c => c.id);
                                
                                if (e.target.checked) {
                                    if (!selectedCalendarIds.includes(cal.id)) selectedCalendarIds.push(cal.id);
                                } else {
                                    selectedCalendarIds = selectedCalendarIds.filter(id => id !== cal.id);
                                }
                                localStorage.setItem('selectedCalendarIds', JSON.stringify(selectedCalendarIds));
                                fetchEvents();
                            };
                            cList.appendChild(item);
                        });
                    }
                } catch(err) {
                    console.error('Failed to load calendars', err);
                    const cList = document.getElementById('calendars-list');
                    if (cList) cList.innerHTML = '<div style="font-size: 0.85rem; color: #ff5252;">Failed to load</div>';
                }

                if (settingsOverlay) settingsOverlay.classList.remove('hidden');
            } catch (err) {
                console.error('Settings error:', err);
                alert('Could not open settings: ' + err.message);
            }
        };
    }


    if (startupCheck) startupCheck.onchange = (e) => ipcRenderer.send('set-login-settings', { openAtLogin: e.target.checked });
    if (alwaysOnTopCheck) {
        alwaysOnTopCheck.onchange = (e) => {
            ipcRenderer.send('set-always-on-top', e.target.checked);
            if (e.target.checked && desktopModeCheck) desktopModeCheck.checked = false;
        };
    }
    if (lockPositionCheck) {
        lockPositionCheck.onchange = (e) => {
            ipcRenderer.send('set-lock-position', e.target.checked);
            updateLockUI(e.target.checked);
        };
    }
    if (desktopModeCheck) {
        desktopModeCheck.onchange = (e) => {
            ipcRenderer.send('set-desktop-mode', e.target.checked);
            if (e.target.checked && alwaysOnTopCheck) alwaysOnTopCheck.checked = false;
        };
    }
    if (startOfWeekSelect) startOfWeekSelect.onchange = (e) => { startOfWeek = parseInt(e.target.value); ipcRenderer.send('set-start-of-week', startOfWeek); renderCalendar(); };
    
    [bgColorPicker, textColorPicker, accentColorPicker, opacitySlider].forEach(el => {
        if (!el) return;
        el.oninput = (e) => {
            let key = el.id.replace('-picker', '').replace('-slider', '');
            if (key === 'bg-color') key = 'bg-base';
            if (key === 'opacity') key = 'bg-opacity';
            
            document.documentElement.style.setProperty(`--${key}`, e.target.value);
            ipcRenderer.send('set-theme-prop', { key, value: e.target.value });
        };
    });



    if (resetSettingsBtn) resetSettingsBtn.onclick = () => { applyTheme(defaultTheme); Object.keys(defaultTheme).forEach(k => ipcRenderer.send('set-theme-prop', { key: k, value: defaultTheme[k] })); };
    if (closeSettings) closeSettings.onclick = () => closeAllModals();

    ipcRenderer.on('sync-now', () => fetchEvents());
    ipcRenderer.invoke('get-settings').then(s => {
        if (s) {
            startOfWeek = s.startOfWeek || 0;
            if (s.lockPosition) updateLockUI(true);
            applyTheme({ 'bg-base': s['bg-base'], 'text-color': s['text-color'], 'accent-color': s['accent-color'], 'bg-opacity': s['bg-opacity'] });
            if (s.version && appVersionLabel) {
                appVersionLabel.textContent = `v${s.version}`;
            }
        }
        renderCalendar(); // Render immediately with empty state/local settings
        fetchEvents();
    });

    window.addEventListener('focus', () => {
        if (Date.now() - lastSyncTime > 60000) {
            console.log('Window focused and more than 1 minute passed since last sync. Syncing now...');
            fetchEvents();
        }
    });

    const updateIndicator = document.getElementById('update-indicator');
    if (updateIndicator) {
        ipcRenderer.on('update-available', (event, version) => {
            updateIndicator.innerText = `New v${version} downloading...`;
            updateIndicator.classList.remove('hidden');
            updateIndicator.style.cursor = 'default';
            updateIndicator.onclick = null;
        });

        ipcRenderer.on('update-downloaded', (event, version) => {
            updateIndicator.innerText = `Install v${version} now`;
            updateIndicator.classList.remove('hidden');
            updateIndicator.style.cursor = 'pointer';
            updateIndicator.onclick = () => {
                ipcRenderer.invoke('install-update');
            };
        });
    }
} catch (e) { alert('JS Error: ' + e.message); }
