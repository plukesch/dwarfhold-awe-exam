# Dev-Log Dwarfhold

Laufende Notizen von Patrick & Omar. Kurz gehalten – Grundlage fürs Exam-Diary.

## Aufteilung

- **Patrick:** D1 (Arbeit & Essen), D2 (Tools & Waffen), D3 (Crafting dauert Zeit)
- **Omar:** D4 (Expeditionen robust), D5 (Speichern/Laden), D7 (Angriff & Verteidigung)
- **Gemeinsam:** D6 (neue Spezies) – Omar den Beitritt über die Expedition, Patrick Produktion/Crafting
- Ein Branch pro Requirement, Merge in `main` nur per Pull Request.

Warum so: D1–D3 drehen sich um Simulation und Forge, D4/D5/D7 um Expeditionen
und State. So arbeiten wir größtenteils in verschiedenen Dateien.

## Teamentscheidungen

| Thema | Entscheidung | Wo im Code |
|---|---|---|
| Wer produziert? | Nur Zwerge mit Job **und** Status `working`. Wer auf Expedition ist, behält den Job, produziert aber nicht. | `isProducing` in `simulation.ts` |

## Log

### 20.11. – Setup (Patrick)
- Starter angeschaut, `npm install`, Tests und Build laufen.
- Bugs im Starter gefunden (siehe `AGENTS.md`), z. B. Zwerge auf Expedition
  produzieren weiter, Stein kann beim Schmieden negativ werden, nach einer
  gescheiterten Expedition bleibt der Zwerg für immer "away".
- `AGENTS.md` angelegt, damit wir (und unsere KI-Tools) auf jedem Rechner
  denselben Kontext haben. `.claude/` ins `.gitignore`.
- Branch-Namen auf `D1`–`D7` vereinheitlicht.

### D1 – Schritt 1: Nur anwesende Arbeiter produzieren (Patrick)
- Problem: `advanceDay` hat nur geschaut, ob ein Zwerg einen Job hat
  (`if (!dwarf.assignment) return`), aber nicht, ob er überhaupt da ist. Wer auf
  Expedition war, hat also gleichzeitig Holz gehackt – zwei Tätigkeiten auf einmal.
  Der Shift Ledger in `ColonyPage.tsx` hatte zusätzlich eine eigene Kopie derselben
  Rechnung (mit demselben Fehler).
- Lösung in `simulation.ts`:
  - `isProducing(dwarf)`: produziert nur bei Job **und** Status `working`.
    Der Job bleibt während einer Expedition gespeichert, damit der Zwerg danach
    automatisch weiterarbeitet.
  - `dailyProduction(dwarves)`: summiert die Tagesproduktion aller arbeitenden
    Zwerge. Pure Funktion, gibt ein neues Objekt zurück.
  - `advanceDay` nutzt `dailyProduction` und baut das Ressourcen-Objekt neu auf,
    statt das alte zu verändern.
- `ColonyPage.tsx`: Der Ledger ruft jetzt auch `dailyProduction` auf statt selbst
  zu rechnen → eine Regel an einer Stelle, Anzeige und Simulation können nicht
  mehr voneinander abweichen. Anzeige "assigned" → "at work".
- Bewusst noch **nicht** geändert: Essensverbrauch und das `Math.max(0, …)` beim
  Essen – das ist Schritt 2 (Hunger-Konsequenz).
- Tests: Zwerg auf Expedition produziert nicht; `dailyProduction` zählt nur
  Arbeitende. Hilfsfunktion `dwarf({...})` hält die Testdaten kurz.
