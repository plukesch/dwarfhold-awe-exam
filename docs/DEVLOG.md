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
| Was passiert bei Hunger? | Reicht das Essen am Tagesende nicht für alle, wird der Rest gegessen, Essen = 0 (nie negativ) und die Kolonie ist `starving`. Solange sie hungert, arbeitet **nur die Pilzfarm**, Holz und Stein liefern 0. Sobald wieder alle satt werden, endet der Hunger. | `isHaltedByHunger`, `advanceDay` in `simulation.ts`; Banner in `Layout.tsx` |
| Wer isst? | Jeder Zwerg isst 1 Ration pro Tag – **auch auf Expedition**, weil er sich seine Ration aus dem Lager mitnimmt. So bleibt der Verbrauch vorhersehbar und eine Expedition ist kein Trick, um Essen zu sparen. | `dailyMeals` in `simulation.ts`, Hinweis im Shift Ledger |

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

### D1 – Schritt 2: Essensverbrauch festgelegt (Patrick)
- Entscheidung im Team: Auch Zwerge auf Expedition essen 1 Ration pro Tag –
  sie nehmen sich ihr Essen für den Weg mit. Das war im Starter zufällig schon
  so (`state.dwarves.length`), jetzt ist es eine bewusste, sichtbare Regel.
- `simulation.ts`: Konstante `FOOD_PER_DWARF` und Funktion `dailyMeals(dwarves)`.
  `advanceDay` und der Shift Ledger verwenden beide `dailyMeals` (gleiches Prinzip
  wie bei `dailyProduction`: eine Regel, eine Stelle).
- UI: kurzer Hinweis unter "Net food after meals", der die Regel erklärt
  (neue CSS-Klasse `.rule-note`, wiederverwendbar für weitere Regel-Hinweise).
- Test: Zwerg auf Expedition isst trotzdem mit (10 Essen, 2 Zwerge → 8).
- Offen für Schritt 3: Was passiert, wenn das Essen nicht reicht.

### D1 – Schritt 3: Hunger hat eine Konsequenz (Patrick)

**Problem im Starter:** `resources.food = Math.max(0, food - dwarves.length)`.
Reicht das Essen nicht, wurde es einfach auf 0 gehalten – sonst passierte nichts.
D1 verlangt aber eine sichtbare Konsequenz, die das Spiel beeinflusst und
deterministisch ist.

**Entscheidung:** Hungert die Kolonie, arbeitet nur noch die Pilzfarm. Holz und
Stein liefern 0, bis wieder alle satt werden.
Alternative wäre "alle produzieren halb so viel" gewesen – verworfen, weil man
runden müsste (3 Holz / 2 = ?) und das schwerer zu erklären ist. Unsere Regel ist
ja/nein, immer gleich, und zeigt dem Spieler direkt den Ausweg: mehr Farmer.

**Ablauf eines Tages (`advanceDay`) jetzt:**
1. Produktion berechnen – mit dem `starving`-Wert vom **Vortag**. Hungert die
   Kolonie, werden alle Nicht-Farmer übersprungen.
2. Produktion zum Lager addieren.
3. Essen ausgeben: `starving = food < meals`.
   - genug da → `food - meals`, `starving = false` (Hunger vorbei)
   - zu wenig → Rest wird gegessen, `food = 0`, `starving = true`
4. Neuen State zurückgeben (Tag + 1, Ressourcen, `starving`).

Die Strafe wirkt also erst am **nächsten** Tag. Grund: Am Tagesende wird
festgestellt "es hat nicht gereicht", und die hungrigen Zwerge haben dann am
Folgetag keine Kraft für Holz/Stein. Die Farmer arbeiten weiter, damit man
wieder herauskommt.

Beispiel (3 Zwerge, alle auf Holz/Stein, 1 Essen übrig):
Tag N: 1 < 3 → Essen 0, `starving = true` →
Tag N+1: nur Farmer produzieren → Dori auf die Farm: 4 Essen ≥ 3 → Essen 1,
`starving = false`.

**Code im Detail:**
- `types.ts` – `ColonyState` hat ein neues Feld `starving: boolean`. Es gehört
  zum Spielzustand (nicht nur zur Anzeige), weil es die Produktion des nächsten
  Tages bestimmt. Startwert in `initialState`: `false`.
- `simulation.ts`
  - `isHaltedByHunger(job, starving)` → `true`, wenn die Kolonie hungert und der
    Job nicht `farming` ist. Eigene Funktion, weil sie an drei Stellen gebraucht
    wird (Simulation, Ledger, Roster) – die Regel steht so nur einmal im Code.
  - `dailyProduction(dwarves, starving = false)` – überspringt Zwerge, deren Job
    durch Hunger gestoppt ist. Der Default `false` sorgt dafür, dass alte
    Aufrufe (z. B. in Tests) ohne Änderung weiter funktionieren.
  - `advanceDay` – siehe Ablauf oben. `Math.max` ist weg, stattdessen die
    explizite Prüfung `food < meals`.
- `ColonyProvider.tsx` – Chronicle-Eintrag bei Beginn und Ende des Hungers:
  - `useRef(colony.starving)` merkt sich den letzten bekannten Wert. Ein Ref
    löst beim Ändern kein neues Rendern aus – passt, weil es nur ein Merker ist.
  - `useEffect(..., [colony.starving, colony.day])` läuft nach jedem Tag.
    Ist `starving` gleich wie vorher → nichts tun. Hat es sich geändert → Ref
    aktualisieren und Eintrag schreiben ("The stores are empty!" bzw.
    "Full bowls again.").
  - Warum nicht direkt in `advanceDay`? `advanceDay` ist eine pure Funktion
    (nur State rein, State raus) und wird in `setColony(current => …)`
    aufgerufen. React darf solche Updater im StrictMode doppelt ausführen –
    ein Log-Eintrag dort würde dann doppelt erscheinen. Seiteneffekte gehören
    deshalb in einen `useEffect`.
- UI (alles liest nur `colony.starving`, keine eigene Logik):
  - `Layout.tsx` – rotes, pulsierendes Banner "Stonehome is starving" mit
    Erklärung und Hinweis "Assign more farmers". Im Layout, damit es auf
    Colony **und** Forge sichtbar ist. `role="alert"` für Screenreader.
  - `ResourceBar.tsx` – neue Prop `starving`; Rations-Kachel wird rot und heißt
    "Rations – starving!".
  - `ColonyPage.tsx` – Ledger ruft `dailyProduction(dwarves, starving)` auf, damit
    "Net food" auch im Hunger stimmt. Gestoppte Jobs werden ausgegraut und
    zeigen "Halted – hunger" statt "+3 / day". Hinweistext um die Hunger-Regel
    ergänzt.
  - `DwarfRoster.tsx` – neue Prop `starving`; arbeitende Zwerge mit gestopptem
    Job bekommen den roten Status "hungry" (statt "working").
  - `styles.css` – Klassen `.hunger-banner`, `.alert`, `.halted`, `.status.hungry`
    am Ende der Datei.

**Tests (`simulation.test.ts`, jetzt 8):**
- Neue Hilfsfunktion `colony({...})` für Test-States (wie `dwarf({...})`).
- Hunger beginnt, wenn Essen nicht reicht – Essen wird 0, nie negativ.
- Während Hunger: Holz und Stein bleiben 0, nur die Farm produziert.
- Hunger endet, sobald die Farm alle satt macht.
- Hunger bleibt, wenn die Farm allein nicht reicht (5 Zwerge, 4 Essen).
- Determinismus: zweimal derselbe State → exakt dasselbe Ergebnis.

**Manuell im Browser geprüft:** Dori auf Mining (alle 3 auf Holz/Stein) → ab
Tag 19 Banner, rote Kachel, "Halted – hunger", "hungry" im Roster, Holz/Stein
bleiben stehen. Dori auf Farm → Tag 21 "Full bowls again", alles wieder normal.

**Mögliche Prüfungsfragen:** Wo wird Hunger festgestellt? (`advanceDay`) –
Warum wirkt er erst am nächsten Tag? – Warum steht der Chronicle-Eintrag im
`useEffect` und nicht in `advanceDay`? – Warum ist `starving` Teil des
`ColonyState`?
