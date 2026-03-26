try {
    const { ipcRenderer, shell } = require('electron');

    let currentViewDate = new Date();
    let events = [];
    let selectedDay = null;
    let startOfWeek = 0;
    let editingEvent = null;

    function stripTags(summary) {
        if (!summary) return '';
        return summary
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
            ev.onclick = (event) => { event.stopPropagation(); showEventDetails(e); };
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
        if (syncIndicator) {
            syncIndicator.innerText = 'Syncing...';
            syncIndicator.classList.remove('hidden', 'error');
        }
        
        const timeMin = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1).toISOString();
        const timeMax = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 2, 0).toISOString();
        
        try {
            // Add a logical timeout on the renderer side as well if needed, 
            // but we'll mostly rely on the main process fix.
            events = await ipcRenderer.invoke('get-events', { timeMin, timeMax });
            if (syncIndicator) {
                syncIndicator.classList.add('hidden');
                syncIndicator.onclick = null;
                syncIndicator.style.cursor = 'default';
            }
        } catch (err) { 
            console.error('Fetch error:', err);
            if (syncIndicator) {
                syncIndicator.innerText = 'Sync Failed (Click to login)';
                syncIndicator.classList.add('error');
                syncIndicator.classList.remove('hidden');
                syncIndicator.style.cursor = 'pointer';
                syncIndicator.onclick = () => ipcRenderer.invoke('reset-auth');
            }
        } finally {
            renderCalendar();
        }
    }

    function openQuickAdd() {
        if (quickAddModal) quickAddModal.classList.remove('hidden');
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



    if (toggleExtraBtn) toggleExtraBtn.onclick = () => { if (extraFields) extraFields.classList.remove('hidden'); toggleExtraBtn.classList.add('hidden'); };

    if (quickAddInput) {
        quickAddInput.onkeydown = async (e) => {
            if (e.key === 'Enter') {
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


                if (editingEvent) await ipcRenderer.invoke('update-event', { calendarId: editingEvent.calendarId, eventId: editingEvent.id, eventData });
                else await ipcRenderer.invoke('create-event', eventData);
                closeAllModals(); fetchEvents();
            } else if (e.key === 'Escape') closeAllModals();
        };
    }

    if (saveEventBtn) saveEventBtn.onclick = () => { if (quickAddInput) { const event = new KeyboardEvent('keydown', { key: 'Enter' }); quickAddInput.dispatchEvent(event); } };

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
        if (quickAddInput) quickAddInput.value = ''; if (eventLocationInput) eventLocationInput.value = ''; if (eventDescriptionInput) eventDescriptionInput.value = '';
        if (toggleExtraBtn) toggleExtraBtn.classList.remove('hidden'); editingEvent = null;
    }

    window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };
    if (closePopupBtn) closePopupBtn.onclick = () => closeAllModals();
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
        }
        renderCalendar(); // Render immediately with empty state/local settings
        fetchEvents();
    });
    setInterval(fetchEvents, 30000);
} catch (e) { alert('JS Error: ' + e.message); }
