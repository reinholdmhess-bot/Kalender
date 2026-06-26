/* Kalender App mit Firebase Cloud Sync
 - Termine in öffentlicher Cloud-Datenbank (publicEvents)
 - Synchronisation zwischen allen Geräten
 - Firebase Firestore für Cloud-Speicherung
 - localStorage Fallback (Offline-Modus)
 - Anonyme Authentifizierung
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, setDoc, deleteDoc, doc, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STORAGE_KEY = 'local_calendar_events_v1';
// Ensure a clean start – remove any stale cached events
localStorage.removeItem(STORAGE_KEY);
let events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let viewDate = new Date();
let loadedMonths = new Set();
let unsubscribe = null;
let isOnline = true; // Firebase ist immer online, Watcher aktualisiert bei Fehlern

// UI Elements
const monthList = document.getElementById('monthList');
const monthsContainer = document.getElementById('monthsContainer');
const monthTitle = document.getElementById('monthTitle');
const dayEvents = document.getElementById('dayEvents');
const modal = document.getElementById('eventModal');
const form = document.getElementById('eventForm');
const addBtn = document.getElementById('addEvent');
const cancelBtn = document.getElementById('cancel');
const syncStatus = document.getElementById('syncStatus');


// Authentifizierung & Firebase-Listener
async function initFirebase() {
  try {
    await signInAnonymously(auth);

    // Listener auf publicEvents für gemeinsame Termine
    const eventsRef = collection(db, 'publicEvents');
    const q = query(eventsRef);

    unsubscribe = onSnapshot(q, async (snapshot) => {
      events = snapshot.docs.map(doc => {
        const data = doc.data();
        const id = data.localId || doc.id;
        return { id, ...data };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      renderMonths(viewDate);
      isOnline = true;
      updateSyncStatus('✓ Synchronisiert', 'green');
    }, (error) => {
      console.warn('Firebase Fehler:', error);
      isOnline = false;
      updateSyncStatus('⚠ Offline-Modus', 'orange');
      events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      renderMonths(viewDate);
    });
  } catch (error) {
    console.error('Auth Fehler:', error);
    updateSyncStatus('✗ Offline-Modus', 'red');
    isOnline = false;
    events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    renderMonths(viewDate);
  }
}

// Event speichern (Cloud + Local), verwendet die übergebene ID
async function saveEvent(eventData) {
  const eventId = eventData.id; // Unsere temp-ID (wird auch als Firestore-ID verwendet)
  if (!isOnline) {
    // Offline-Modus: Event ist bereits lokal hinzugefügt
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    renderMonths(viewDate);
    return;
  }
  try {
    const eventRef = doc(db, 'publicEvents', eventId);
    const { id: _, ...rest } = eventData;
    await setDoc(eventRef, { ...rest, localId: eventId });
    // Der onSnapshot-Listener aktualisiert das events Array automatisch
    updateSyncStatus('✓ Gespeichert', 'green');
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    updateSyncStatus('⚠ Lokal gespeichert', 'orange');
    isOnline = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    renderMonths(viewDate);
  }
}

// Event löschen - verwendet die localId (gespeichert in Firestore-Daten)
async function deleteEventFirebase(localId) {
  if (!isOnline) {
    // Offline-Modus: nur lokal löschen
    events = events.filter(e => e.id !== localId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    renderMonths(viewDate);
    return;
  }

  // Die Firestore-ID ist die localId (wir speichern sie in den Daten)
  try {
    const eventRef = doc(db, 'publicEvents', localId);
    await deleteDoc(eventRef);
    updateSyncStatus('↻ Lösche...', 'blue');
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    updateSyncStatus('⚠ Löschen fehlgeschlagen', 'red');
    isOnline = false;
  }
}

// Sync-Status anzeigen
function updateSyncStatus(text, color) {
  if (syncStatus) {
    syncStatus.textContent = text;
    syncStatus.style.color = color;
  }
}

// Hilfsfunktionen
function toISODate(d) {
  const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function getWeekNumber(d) {
  const first = new Date(d.getFullYear(), 0, 1);
  const pre = first.getDay();
  first.setDate(first.getDate() - pre + 1);
  const diff = d - first;
  return Math.floor(diff / 604800000) + 1;
}
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year/100);
  const c = year % 100;
  const d = Math.floor(b/4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c/4);
  const k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31);
  const day = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month-1, day);
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }

function germanyBW_Holidays(year) {
  const hol = [];
  const eas = easterDate(year);
  function add(d, name){ hol.push({date:toISODate(d), name}); }
  add(new Date(year,0,1),'Neujahr');
  add(addDays(eas, -2),'Karfreitag');
  add(addDays(eas, 1),'Ostermontag');
  add(new Date(year,4,1),'Tag der Arbeit');
  add(addDays(eas, 39),'Christi Himmelfahrt');
  add(addDays(eas, 50),'Pfingstmontag');
  add(addDays(eas, 60),'Fronleichnam');
  add(new Date(year,9,3),'Tag der Deutschen Einheit');
  add(new Date(year,10,1),'Allerheiligen');
  add(new Date(year,11,25),'1. Weihnachtstag');
  add(new Date(year,11,26),'2. Weihnachtstag');
  return hol;
}

// render
function renderMonths(startDate, monthCount = 6){
  monthsContainer.innerHTML = '';
  loadedMonths.clear();
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  const holidays = {};
  for(let y = year; y <= year + 1; y++){
    germanyBW_Holidays(y).forEach(h => { holidays[h.date] = h.name; });
  }

  monthTitle.textContent = startDate.toLocaleString('de-DE',{month:'long', year:'numeric'});

  for(let offset = 0; offset < monthCount; offset++){
    const cur = new Date(year, month + offset, 1);
    const curYear = cur.getFullYear();
    const curMonth = cur.getMonth();
    const monthKey = `${curYear}-${curMonth}`;
    loadedMonths.add(monthKey);

    appendMonthToContainer(cur, holidays, curYear, curMonth);
  }
}

function appendMonthToContainer(cur, holidays, curYear, curMonth){
  const last = new Date(curYear, curMonth + 1, 0);
  const monthSection = document.createElement('div');
  monthSection.className = 'month-section';
  monthSection.setAttribute('data-year', curYear);
  monthSection.setAttribute('data-month', curMonth);
  monthSection.style.marginBottom = '16px';

  const monthHeader = document.createElement('h3');
  monthHeader.textContent = cur.toLocaleString('de-DE', {month: 'long', year: 'numeric'});
  monthHeader.style.margin = '8px 0';
  monthHeader.style.color = '#0f172a';
  monthSection.appendChild(monthHeader);

  for(let d=1; d<=last.getDate(); d++){
    const curDay = new Date(curYear, curMonth, d);
    const iso = toISODate(curDay);
    const kw = getWeekNumber(curDay);
    const dow = curDay.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const today = new Date();
    const isToday = curDay.getDate() === today.getDate() && curDay.getMonth() === today.getMonth() && curDay.getFullYear() === today.getFullYear();

    const dayRow = document.createElement('div');
    dayRow.className = 'day-row' + (isWeekend ? ' weekend' : '') + (isToday ? ' today' : '');

    // Einzelner Tap öffnet den Tag
    dayRow.addEventListener('click', () => openDay(curDay));

    // '+' Button für neuen Termin
    const addBtn = document.createElement('span');
    addBtn.className = 'add-day-btn';
    addBtn.style.cssText = 'margin-left:auto; margin-right:4px; cursor:pointer; font-size:12px; color:#0891b2;';
    addBtn.textContent = '+';
    addBtn.title = 'Neuen Termin für diesen Tag';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventForm(curDay);
    });
    dayRow.appendChild(addBtn);

    const kwCell = document.createElement('div'); kwCell.className='kw-cell'; kwCell.textContent = 'KW '+kw;
    const dateEl = document.createElement('div'); dateEl.className='day-date';
    const dow_txt = document.createElement('div'); dow_txt.className='day-date-day'; dow_txt.textContent = curDay.toLocaleString('de-DE',{weekday:'short'});
    const day_txt = document.createElement('div'); day_txt.textContent = d;
    dateEl.appendChild(dow_txt); dateEl.appendChild(day_txt);

    // Long-tap für Termin-Eingabe (nur auf der Datumsziffer, nicht auf ganzer Zeile)
    // Verhindert Chrome's context menu (herunterladen/teilen/drucken)
    let touchTimer = null;
    day_txt.style.cursor = 'pointer';
    day_txt.style.userSelect = 'none';
    day_txt.addEventListener('touchstart', (e) => {
      // Nicht preventDefault() - sonst wird Zoom blockiert
      touchTimer = setTimeout(() => {
        openEventForm(curDay);
      }, 500);
    });
    day_txt.addEventListener('touchend', (e) => {
      e.preventDefault(); // Verhindert Chrome's context menu bei kurzem Tap
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });
    day_txt.addEventListener('touchmove', (e) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    const content = document.createElement('div'); content.className='day-content';
    const left = document.createElement('div'); left.textContent='';
    const right = document.createElement('div'); right.className='event-list';

    if(holidays[iso]){
      const pill = document.createElement('span'); pill.className='event-pill holiday'; pill.textContent=holidays[iso]; right.appendChild(pill);
    }

    const dayEventsList = events.filter(ev => {
      if(ev.repeat==='yearly'){
        const evd = new Date(ev.date);
        return evd.getDate()===curDay.getDate() && evd.getMonth()===curDay.getMonth();
      }
      return ev.date===iso;
    });

    dayEventsList.forEach(ev=>{
      if(ev.repeat==='yearly' || ev.birthYear){
        const pill = document.createElement('span');
        pill.className='event-pill';
        pill.setAttribute('data-event-id', ev.id);
        if(ev.birthYear){
          pill.classList.add('birthday');
          const age = curDay.getFullYear()-Number(ev.birthYear);
          pill.textContent = ev.title + (isFinite(age)? ' ('+age+')':'');
        } else {
          pill.textContent = ev.title;
        }
        pill.style.cursor = 'pointer';

        // Long-tap für Kontextmenü (mobile Geräte)
        let pillTouchTimer = null;
        pill.addEventListener('touchstart', (e) => {
          e.preventDefault();
          pillTouchTimer = setTimeout(() => {
            const touch = e.touches[0];
            const menu = document.getElementById('contextMenu');
            menu.style.left = touch.clientX + 'px';
            menu.style.top = touch.clientY + 'px';
            menu.classList.remove('hidden');
            menu.currentEventId = ev.id;
          }, 500);
        });
        pill.addEventListener('touchend', (e) => {
          if (pillTouchTimer) {
            clearTimeout(pillTouchTimer);
            pillTouchTimer = null;
          }
        });
        pill.addEventListener('touchmove', (e) => {
          if (pillTouchTimer) {
            clearTimeout(pillTouchTimer);
            pillTouchTimer = null;
          }
        });
        pill.addEventListener('contextmenu', e=>{
          e.preventDefault();
          const menu = document.getElementById('contextMenu');
          menu.style.left = e.clientX + 'px';
          menu.style.top = e.clientY + 'px';
          menu.classList.remove('hidden');
          menu.currentEventId = ev.id;
        });
        right.appendChild(pill);
      } else {
        const evt = document.createElement('span');
        evt.className='event-pill single-event';
        evt.style.backgroundColor = '#fed7aa';
        evt.style.color = '#92400e';
        evt.style.fontWeight = '600';
        evt.style.cursor = 'pointer';
        evt.textContent = (ev.time? ev.time + ' ':'') + ev.title;
        evt.setAttribute('data-event-id', ev.id);

        // Long-tap für Kontextmenü (mobile Geräte)
        let evtTouchTimer = null;
        evt.addEventListener('touchstart', (e) => {
          e.preventDefault();
          evtTouchTimer = setTimeout(() => {
            const touch = e.touches[0];
            const menu = document.getElementById('contextMenu');
            menu.style.left = touch.clientX + 'px';
            menu.style.top = touch.clientY + 'px';
            menu.classList.remove('hidden');
            menu.currentEventId = ev.id;
          }, 500);
        });
        evt.addEventListener('touchend', (e) => {
          if (evtTouchTimer) {
            clearTimeout(evtTouchTimer);
            evtTouchTimer = null;
          }
        });
        evt.addEventListener('touchmove', (e) => {
          if (evtTouchTimer) {
            clearTimeout(evtTouchTimer);
            evtTouchTimer = null;
          }
        });
        evt.addEventListener('contextmenu', e=>{
          e.preventDefault();
          const menu = document.getElementById('contextMenu');
          menu.style.left = e.clientX + 'px';
          menu.style.top = e.clientY + 'px';
          menu.classList.remove('hidden');
          menu.currentEventId = ev.id;
        });
        left.appendChild(evt);
      }
    });
    content.appendChild(left); content.appendChild(right);
    dayRow.appendChild(kwCell); dayRow.appendChild(dateEl); dayRow.appendChild(content);
    monthSection.appendChild(dayRow);
  }

  monthsContainer.appendChild(monthSection);
}

function openDay(d){
  dayEvents.innerHTML = '';
  const iso = toISODate(d);
  const list = events.filter(ev=> ev.date===iso || (ev.repeat==='yearly' && (new Date(ev.date)).getDate()===d.getDate() && (new Date(ev.date)).getMonth()===d.getMonth()));
  list.sort((a,b)=> (a.time||'') > (b.time||'') ? 1 : -1);
  list.forEach(ev=>{
    const li = document.createElement('li');
    li.setAttribute('data-event-id', ev.id);
    li.tabIndex = 0;
    const title = document.createElement('div'); title.textContent = (ev.time? ev.time + ' ':'') + ev.title;
    const desc = document.createElement('div'); desc.textContent = ev.desc||''; desc.style.fontSize='0.85rem'; desc.style.color='#556';
    if(ev.birthYear){ const age = d.getFullYear()-Number(ev.birthYear); const ageEl = document.createElement('div'); ageEl.textContent = 'Alter: '+age; ageEl.style.color='#0a8'; ageEl.style.fontSize='0.85rem'; li.appendChild(ageEl); }
    li.appendChild(title); li.appendChild(desc);

    // Long-tap für Kontextmenü (mobile Geräte) + contextmenu für Desktop
    let liTouchTimer = null;
    li.addEventListener('touchstart', (e) => {
      e.preventDefault();
      liTouchTimer = setTimeout(() => {
        const touch = e.touches[0];
        const menu = document.getElementById('contextMenu');
        menu.style.left = touch.clientX + 'px';
        menu.style.top = touch.clientY + 'px';
        menu.classList.remove('hidden');
        menu.currentEventId = ev.id;
      }, 500);
    });
    li.addEventListener('touchend', (e) => {
      if (liTouchTimer) {
        clearTimeout(liTouchTimer);
        liTouchTimer = null;
      }
    });
    li.addEventListener('touchmove', (e) => {
      if (liTouchTimer) {
        clearTimeout(liTouchTimer);
        liTouchTimer = null;
      }
    });
    li.addEventListener('contextmenu', e=>{
      e.preventDefault();
      li.focus();
      const menu = document.getElementById('contextMenu');
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.classList.remove('hidden');
      menu.currentEventId = ev.id;
    });

    li.addEventListener('click', ()=>{
      dayEvents.querySelectorAll('li').forEach(l => l.style.backgroundColor = '');
      li.focus();
      li.style.backgroundColor = '#dbeafe';
    });

    dayEvents.appendChild(li);
  });
}

function deleteEvent(eventId){
  deleteEventFirebase(eventId);
  renderMonths(viewDate);
  const firstLi = dayEvents.querySelector('li');
  if(firstLi){
    const evId = firstLi.getAttribute('data-event-id');
    const ev = events.find(e => e.id === evId);
    if(ev){ openDay(new Date(ev.date)); }
  } else {
    openDay(new Date());
  }
}

function openEventForm(d){
  modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'Neuer Termin';
  delete form.dataset.editId;
  form.reset();
  form.date.value = toISODate(d);
  form.time.focus();
}

addBtn.addEventListener('click', ()=> openEventForm(viewDate));
cancelBtn.addEventListener('click', ()=> modal.classList.add('hidden'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const editId = form.dataset.editId;

  if(editId){
    // Bearbeiten: vorhandenes Event aktualisieren
    const ev = {
      id: editId,
      title: fd.get('title'),
      date: fd.get('date'),
      time: fd.get('time') || '',
      repeat: fd.get('repeat'),
      desc: fd.get('desc') || '',
      birthYear: fd.get('birthYear') || ''
    };
    // Lokales Update
    const idx = events.findIndex(e => e.id === editId);
    if(idx >= 0){
      events[idx] = ev;
    }
    await saveEvent(ev);
    delete form.dataset.editId;
  } else {
    // Neuer Termin
    const tempId = 'local-' + Date.now();
    const ev = {
      id: tempId,
      title: fd.get('title'),
      date: fd.get('date'),
      time: fd.get('time') || '',
      repeat: fd.get('repeat'),
      desc: fd.get('desc') || '',
      birthYear: fd.get('birthYear') || '',
      createdAt: new Date().toISOString()
    };
    events.push(ev);
    await saveEvent(ev);
  }
  modal.classList.add('hidden');
});

// export
document.getElementById('exportBtn').addEventListener('click', () => {
  const json = JSON.stringify(events, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kalender-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported)) {
        for (const item of imported) {
          // Temporäre ID für sofortige Anzeige
          item.id = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          events.push(item);
          await saveEvent(item);
        }
        alert('Termine importiert!');
      } else {
        alert('Ungültiges Format');
      }
    } catch (err) {
      alert('Fehler beim Importieren: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// navigation - mit Fehlerprüfung für Button-Elemente
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const todayBtn = document.getElementById('today');

console.log('Buttons found:', {prevBtn, nextBtn, todayBtn});

if (prevBtn) prevBtn.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonths(viewDate); });
if (nextBtn) nextBtn.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonths(viewDate); });
if (todayBtn) todayBtn.addEventListener('click', () => {
  alert('Heute-Button geklickt!');
  console.log('Today button clicked!');
  viewDate = new Date();
  console.log('viewDate set to:', viewDate);
  renderMonths(viewDate);
  console.log('renderMonths called');
  // Zuerst scrollen, dann Panel öffnen
  setTimeout(()=>{
    console.log('Setting up scroll timeout, calling scrollToToday');
    scrollToToday();
    setTimeout(() => {
      console.log('Opening day panel');
      openDay(new Date());
    }, 300);
  }, 50);
}) else {
  console.error('Today button not found in DOM!');
}

// Mobile Date-Trigger - für Touch-Geräte ohne Chrome Context-Menü
const mobileDateTrigger = document.getElementById('mobileDateTrigger');
const jumpToDateInput = document.getElementById('jumpToDate');
if (mobileDateTrigger) {
  mobileDateTrigger.addEventListener('click', () => {
    jumpToDateInput.showPicker(); // Öffnet den Date-Picker ohne fokussieren
  });
}
// Schütze vor touch-Interaktionen (verhindert Chrome Context-Menü und Zoom-Fokussierung)
jumpToDateInput.addEventListener('touchstart', (e) => {
  e.stopPropagation();
});
jumpToDateInput.addEventListener('touchend', (e) => {
  e.preventDefault(); // Verhindert Chrome's context menu
});

document.getElementById('jumpToDate').addEventListener('change', e=>{
  const dateStr = e.target.value;
  if(!dateStr) return;
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const targetMonth = new Date(year, month - 1, 1);
  renderMonths(targetMonth);
  setTimeout(()=>{
    const sections = monthsContainer.querySelectorAll('.month-section');
    for(const section of sections){
      const secYear = Number(section.getAttribute('data-year'));
      const secMonth = Number(section.getAttribute('data-month'));
      if(secYear === year && secMonth === month - 1){
        const dayRows = section.querySelectorAll('.day-row');
        for(const row of dayRows){
          const dayText = row.querySelector('.day-date div:last-child');
          if(dayText && parseInt(dayText.textContent) === day){
            row.style.backgroundColor = '#fff3cd';
            row.scrollIntoView({behavior: 'smooth', block: 'center'});
            setTimeout(()=> row.style.backgroundColor = '', 2000);
            break;
          }
        }
        break;
      }
    }
    openDay(targetDate);
  }, 50);
});

// Hilfsfunktion: Zu heute scrollen
function scrollToToday(){
  const today = new Date();
  console.log('scrollToToday: looking for', today.getFullYear(), today.getMonth(), today.getDate());
  const sections = monthsContainer.querySelectorAll('.month-section');
  console.log('scrollToToday: found', sections.length, 'sections');
  for(const section of sections){
    const secYear = Number(section.getAttribute('data-year'));
    const secMonth = Number(section.getAttribute('data-month'));
    console.log('scrollToToday: checking section', secYear, secMonth);
    if(secYear === today.getFullYear() && secMonth === today.getMonth()){
      const dayRows = section.querySelectorAll('.day-row');
      console.log('scrollToToday: found', dayRows.length, 'day rows in today month');
      for(const row of dayRows){
        const dayText = row.querySelector('.day-date div:last-child');
        const dayNum = dayText ? parseInt(dayText.textContent) : null;
        console.log('scrollToToday: checking day', dayNum);
        if(dayText && dayNum === today.getDate()){
          console.log('scrollToToday: scrolling to today row');
          row.scrollIntoView({behavior: 'smooth', block: 'center'});
          break;
        }
      }
      break;
    }
  }
}

// scroll handling
monthList.addEventListener('scroll', ()=>{
  const sections = monthsContainer.querySelectorAll('.month-section');
  if(sections.length === 0) return;

  let firstVisibleMonth = null;
  for(const section of sections){
    const rect = section.getBoundingClientRect();
    if(rect.top < monthList.clientHeight && rect.bottom > 0){
      firstVisibleMonth = section;
      break;
    }
  }

  if(firstVisibleMonth){
    const year = Number(firstVisibleMonth.getAttribute('data-year'));
    const month = Number(firstVisibleMonth.getAttribute('data-month'));
    monthTitle.textContent = new Date(year, month, 1).toLocaleString('de-DE', {month:'long', year:'numeric'});
  }

  if(monthList.scrollHeight - monthList.scrollTop - monthList.clientHeight < 300){
    const lastSection = sections[sections.length - 1];
    if(lastSection){
      const lastYear = Number(lastSection.getAttribute('data-year'));
      const lastMonth = Number(lastSection.getAttribute('data-month'));
      const nextDate = new Date(lastYear, lastMonth + 1, 1);

      const holidays = {};
      for(let y = nextDate.getFullYear(); y <= nextDate.getFullYear() + 1; y++){
        germanyBW_Holidays(y).forEach(h => { holidays[h.date] = h.name; });
      }

      for(let i = 0; i < 3; i++){
        const checkDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + i, 1);
        const monthKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
        if(!loadedMonths.has(monthKey)){
          loadedMonths.add(monthKey);
          appendMonthToContainer(checkDate, holidays, checkDate.getFullYear(), checkDate.getMonth());
        }
      }
    }
  }
});

// Kontextmenü schließen
document.addEventListener('click', e=>{
  const menu = document.getElementById('contextMenu');
  if(!menu.contains(e.target)){
    menu.classList.add('hidden');
  }
});

// Bearbeiten via Kontext-Menü
function editEvent(eventId){
  const ev = events.find(e => e.id === eventId);
  if(!ev) return;
  modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'Termin bearbeiten';
  form.title.value = ev.title || '';
  form.date.value = ev.date || '';
  form.time.value = ev.time || '';
  form.repeat.value = ev.repeat || 'none';
  form.birthYear.value = ev.birthYear || '';
  form.desc.value = ev.desc || '';
  // Speicher-ID für Update
  form.dataset.editId = eventId;
}

// Löschen via Kontext-Menü
document.getElementById('deleteMenuOption').addEventListener('click', ()=>{
  const menu = document.getElementById('contextMenu');
  const eventId = menu.currentEventId;
  if(eventId && confirm('Termin wirklich löschen?')){
    deleteEvent(eventId);
  }
  menu.classList.add('hidden');
});

// Bearbeiten-Handler
document.getElementById('editMenuOption').addEventListener('click', ()=>{
  const menu = document.getElementById('contextMenu');
  const eventId = menu.currentEventId;
  if(eventId){
    editEvent(eventId);
  }
  menu.classList.add('hidden');
});

// Delete-Taste
document.addEventListener('keydown', e=>{
  if(e.key === 'Delete'){
    const focused = document.activeElement;
    const eventId = focused?.getAttribute?.('data-event-id');
    if(eventId && confirm('Termin wirklich löschen?')){
      deleteEvent(eventId);
    }
  }
});


// init
renderMonths(viewDate);
initFirebase();

// scroll to today on load
setTimeout(scrollToToday, 50);