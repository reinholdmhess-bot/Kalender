Kalender — einfache lokale PWA

Features:
- Monats-/Tagesansicht
- Termine mit Uhrzeit
- jährliche Wiederholung (z.B. Geburtstage)
- Geburtstage: Alter wird angezeigt, wenn Geburtsjahr angegeben
- Feiertage: Deutschland (Baden-Württemberg) berechnet
- Speichert Daten in `localStorage`
- PWA-ready (Service Worker + manifest)

Lokal testen:
1. Öffne `apps/kalender/index.html` im Browser (Chrome/Edge/Firefox).
2. Termine hinzufügen über "Termin hinzufügen".

Als PWA installieren:
- Öffne die Seite im Browser und wähle "Installieren" (Chrome/Edge) oder "Zum Home-Bildschirm hinzufügen" auf Mobilgeräten.

Hosting (GitHub Pages):
- Erstelle ein neues Repository und push den Ordner `apps/kalender` als Root.
- Aktiviere GitHub Pages (Branch gh-pages oder main/docs).
- Die Seite ist dann per HTTPS erreichbar.

Wenn du möchtest, erstelle ich optional ein `package.json` und ein GitHub Actions-Workflow zum automatischen Deploy auf GitHub Pages.