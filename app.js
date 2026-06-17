/* Simple calendar app
 - month list with continuous days
 - events stored in localStorage
 - yearly repetition and birthdays with age
 - Germany (Baden-Wuerttemberg) holidays computed
 - KW-Nummern, durchscrollbar, Doppelklick-Input, Import/Export
 - Infinite Scroll, dynamische Monatsüberschrift
*/

const STORAGE_KEY = 'local_calendar_events_v1';
let events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let viewDate = new Date();
let loadedMonths = new Set(); // track which months are loaded

// helpers
function toISODate(d){ const y=d.getFullYear(),m=d.getMonth()+1,dd=d.getDate(); return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}` }
function load(){ events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)) }
function getWeekNumber(d){
  const first = new Date(d.getFullYear(), 0, 1);
  const pre = first.getDay();
  first.setDate(first.getDate() - pre + 1);
  const diff = d - first;
  return Math.floor(diff / 604800000) + 1;
}

// Easter calculation (Anonymous Gregorian algorithm)
function easterDate(year){
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
function addDays(d, n){ const r = new Date(d); r.setDate(r.getDate()+n); return r }

function germanyBW_Holidays(year){
  const hol = [];
  const eas = easterDate(year);
  function add(d, name){ hol.push({date:toISODate(d), name}) }
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
const monthList = document.getElementById('monthList');
const monthsContainer = document.getElementById('monthsContainer');
const monthTitle = document.getElementById('monthTitle');
const dayEvents = document.getElementById('dayEvents');

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
    dayRow.addEventListener('dblclick', ()=> openEventForm(curDay));
    dayRow.addEventListener('click', ()=> openDay(curDay));

    const kwCell = document.createElement('div'); kwCell.className='kw-cell'; kwCell.textContent = 'KW '+kw;
    const dateEl = document.createElement('div'); dateEl.className='day-date';
    const dow_txt = document.createElement('div'); dow_txt.className='day-date-day'; dow_txt.textContent = curDay.toLocaleString('de-DE',{weekday:'short'});
    const day_txt = document.createElement('div'); day_txt.textContent = d;
    dateEl.appendChild(dow_txt); dateEl.appendChild(day_txt);

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

    // Single events on left, yearly on right
    dayEventsList.forEach(ev=>{
      if(ev.repeat==='yearly' || ev.birthYear){
        const pill = document.createElement('span'); pill.className='event-pill';
        if(ev.birthYear){ 
          pill.classList.add('birthday'); 
          const age = curDay.getFullYear()-Number(ev.birthYear); 
          pill.textContent = ev.title + (isFinite(age)? ' ('+age+')':''); 
        } else {
          pill.textContent = ev.title;
        }
        right.appendChild(pill);
      } else {
        // single event - show on left
        const evt = document.createElement('span'); 
        evt.className='event-pill single-event'; 
        evt.style.backgroundColor = '#fed7aa'; // orange statt blau
        evt.style.color = '#92400e'; 
        evt.style.fontWeight = '600'; 
        evt.style.cursor = 'pointer';
        evt.textContent = (ev.time? ev.time + ' ':'') + ev.title;
        evt.setAttribute('data-event-id', ev.id);
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
    li.tabIndex = 0; // make focusable
    const title = document.createElement('div'); title.textContent = (ev.time? ev.time + ' ':'') + ev.title;
    const desc = document.createElement('div'); desc.textContent = ev.desc||''; desc.style.fontSize='0.85rem'; desc.style.color='#556';
    if(ev.birthYear){ const age = d.getFullYear()-Number(ev.birthYear); const ageEl = document.createElement('div'); ageEl.textContent = 'Alter: '+age; ageEl.style.color='#0a8'; ageEl.style.fontSize='0.85rem'; li.appendChild(ageEl); }
    li.appendChild(title); li.appendChild(desc);
    
    // Rechtsklick-Menü
    li.addEventListener('contextmenu', e=>{
      e.preventDefault();
      li.focus();
      const menu = document.getElementById('contextMenu');
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.classList.remove('hidden');
      menu.currentEventId = ev.id;
    });
    
    // Click - focus
    li.addEventListener('click', ()=>{
      dayEvents.querySelectorAll('li').forEach(l => l.style.backgroundColor = '');
      li.focus();
      li.style.backgroundColor = '#dbeafe';
    });
    
    dayEvents.appendChild(li);
  });
}

function deleteEvent(eventId){
  events = events.filter(e => e.id !== eventId);
  save();
  // Refresh with current viewDate
  renderMonths(viewDate);
  // Open the day that was previously shown (get from first event)
  const firstLi = dayEvents.querySelector('li');
  if(firstLi){
    const evId = Number(firstLi.getAttribute('data-event-id'));
    const ev = events.find(e => e.id === evId);
    if(ev){
      const d = new Date(ev.date);
      openDay(d);
    }
  } else {
    openDay(new Date());
  }
}

// modal
const modal = document.getElementById('eventModal');
const form = document.getElementById('eventForm');
const addBtn = document.getElementById('addEvent');
const cancelBtn = document.getElementById('cancel');

function openEventForm(d){
  modal.classList.remove('hidden'); 
  form.reset();
  form.date.value = toISODate(d);
  form.time.focus();
}

addBtn.addEventListener('click', ()=> openEventForm(viewDate));
cancelBtn.addEventListener('click', ()=> modal.classList.add('hidden'));

form.addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(form);
  const ev = { id: Date.now(), title: fd.get('title'), date: fd.get('date'), time: fd.get('time')||'', repeat: fd.get('repeat'), desc: fd.get('desc')||'', birthYear: fd.get('birthYear')||'' };
  events.push(ev); save(); modal.classList.add('hidden'); renderMonths(viewDate);
});

// import/export
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const json = JSON.stringify(events, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kalender-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if(Array.isArray(imported)){
        events = imported;
        save();
        renderMonths(viewDate);
        alert('Termine importiert!');
      } else alert('Ungültiges Format');
    } catch(err){ alert('Fehler beim Importieren: ' + err.message); }
  };
  reader.readAsText(file);
});

// nav
document.getElementById('prev').addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonths(viewDate); });
document.getElementById('next').addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonths(viewDate); });
document.getElementById('today').addEventListener('click', ()=>{ viewDate = new Date(); renderMonths(viewDate); });

// Jump to date
document.getElementById('jumpToDate').addEventListener('change', e=>{
  const dateStr = e.target.value; // format: YYYY-MM-DD
  if(!dateStr) return;
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  
  // Ensure months are loaded
  const targetMonth = new Date(year, month - 1, 1);
  renderMonths(targetMonth);
  
  // Scroll to target day and highlight
  setTimeout(()=>{
    const sections = monthsContainer.querySelectorAll('.month-section');
    let foundDay = null;
    for(const section of sections){
      const secYear = Number(section.getAttribute('data-year'));
      const secMonth = Number(section.getAttribute('data-month'));
      if(secYear === year && secMonth === month - 1){
        // find the specific day row
        const dayRows = section.querySelectorAll('.day-row');
        for(const row of dayRows){
          const dayText = row.querySelector('.day-date div:last-child');
          if(dayText && parseInt(dayText.textContent) === day){
            foundDay = row;
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

// Scroll events - update title and infinite load
monthList.addEventListener('scroll', ()=>{
  // find first visible month section
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
  
  // infinite scroll - load more if near bottom
  if(monthList.scrollHeight - monthList.scrollTop - monthList.clientHeight < 300){
    const lastSection = sections[sections.length - 1];
    if(lastSection){
      const lastYear = Number(lastSection.getAttribute('data-year'));
      const lastMonth = Number(lastSection.getAttribute('data-month'));
      const nextDate = new Date(lastYear, lastMonth + 1, 1);
      
      // load 3 more months
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

// Kontextmenü schließen bei Klick außerhalb
document.addEventListener('click', e=>{
  const menu = document.getElementById('contextMenu');
  if(!menu.contains(e.target)){
    menu.classList.add('hidden');
  }
});

// Löschen via Kontext-Menü
document.getElementById('deleteMenuOption').addEventListener('click', ()=>{
  const menu = document.getElementById('contextMenu');
  const eventId = menu.currentEventId;
  if(eventId && confirm('Termin wirklich löschen?')){
    deleteEvent(eventId);
  }
  menu.classList.add('hidden');
});

// Delete-Taste
document.addEventListener('keydown', e=>{
  if(e.key === 'Delete'){
    const focused = document.activeElement;
    if(focused && focused.getAttribute && focused.getAttribute('data-event-id')){
      const eventId = Number(focused.getAttribute('data-event-id'));
      if(eventId && confirm('Termin wirklich löschen?')){
        deleteEvent(eventId);
      }
    }
  }
});

// init
load(); renderMonths(viewDate); openDay(new Date());

// scroll to today on load
setTimeout(()=>{
  const today = new Date();
  const sections = monthsContainer.querySelectorAll('.month-section');
  for(const section of sections){
    const secYear = Number(section.getAttribute('data-year'));
    const secMonth = Number(section.getAttribute('data-month'));
    if(secYear === today.getFullYear() && secMonth === today.getMonth()){
      const dayRows = section.querySelectorAll('.day-row');
      for(const row of dayRows){
        const dayText = row.querySelector('.day-date div:last-child');
        if(dayText && parseInt(dayText.textContent) === today.getDate()){
          row.scrollIntoView({behavior: 'smooth', block: 'center'});
          break;
        }
      }
      break;
    }
  }
}, 50);

// expose for debugging
window._cal = {events, save, load, renderMonth};
