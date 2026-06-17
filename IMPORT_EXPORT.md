# Import/Export Dokumentation

## Exportieren
- Klick auf **Exportieren** → speichert alle Termine als `kalender-YYYY-MM-DD.json`.

## Importieren

### Format für Termine

Die JSON-Datei muss ein Array von Event-Objekten sein:

```json
[
  {
    "id": 1234567890,
    "title": "Mein Termin",
    "date": "2026-06-15",
    "time": "14:30",
    "repeat": "none",
    "desc": "Beschreibung",
    "birthYear": ""
  },
  {
    "id": 1234567891,
    "title": "Geburtstag Anna",
    "date": "1985-03-15",
    "time": "",
    "repeat": "yearly",
    "desc": "Anna wird älter",
    "birthYear": "1985"
  }
]
```

### Feldspezifikation

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `id` | number | nein | eindeutige ID (wird ignoriert, neuere ID wird zugewiesen) |
| `title` | string | ja | Termintitel / Name |
| `date` | string | ja | Datum im Format `YYYY-MM-DD` |
| `time` | string | nein | Uhrzeit im Format `HH:MM` (leer für ganztägig) |
| `repeat` | string | ja | `"none"` = einmalig, `"yearly"` = jährlich wiederkehrend |
| `desc` | string | nein | Beschreibung / Notiz |
| `birthYear` | string | nein | Geburtsjahr (z.B. `"1985"` für Geburtstage mit Altersanzeige) |

### Beispiele

#### Einmaliger Termin
```json
{
  "title": "Zahnarzt",
  "date": "2026-07-22",
  "time": "10:00",
  "repeat": "none",
  "desc": "Prophylaxe"
}
```

#### Jährlicher Termin (Geburtstag mit Alter)
```json
{
  "title": "Hans' Geburtstag",
  "date": "1975-05-10",
  "time": "",
  "repeat": "yearly",
  "birthYear": "1975"
}
```
→ Der Kalender zeigt dann z.B. „Hans' Geburtstag (51)" für 2026

#### Ganztägiger Termin
```json
{
  "title": "Sommerferien",
  "date": "2026-07-30",
  "repeat": "yearly",
  "desc": ""
}
```

### Kalenderchen-Import konvertieren

Wenn deine alte `Kalenderchen`-App Termine exportiert, müssen diese in obiges Format konvertiert werden.

**Häufig unterstützte Formate:**
- CSV (Comma-Separated Values)
- iCal / ICS
- SQLite-Datenbank

**Konvertierung beispiele:**

**Aus CSV (z.B. `titel,datum,uhrzeit,jährlich,geburtsjahr`)**
```
Hans' Geburtstag,1975-05-10,,true,1975
Zahnarzt,2026-07-22,10:00,false,
```

In JSON:
```json
[
  {"title":"Hans' Geburtstag","date":"1975-05-10","time":"","repeat":"yearly","birthYear":"1975","desc":""},
  {"title":"Zahnarzt","date":"2026-07-22","time":"10:00","repeat":"none","birthYear":"","desc":""}
]
```

**Falls Kalenderchen-Dateien vorhanden:** Exportiere aus deinem alten Kalender in eines dieser Formate (CSV, ICS) und teile die Datei — ich stelle dir ein Konvertierungs-Skript zur Verfügung.

### Fehlerbehandlung

- Ungültige Daten werden beim Import ignoriert.
- Fehlende erforderliche Felder (`title`, `date`) führen zu Fehler.
- Ungültige Datumsformate werden ebenfalls ignoriert.
