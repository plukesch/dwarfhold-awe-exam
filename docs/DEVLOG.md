# Dev-Log Dwarfhold

Laufende Notizen von Patrick & Omar – Grundlage fürs Exam-Diary.

## Aufteilung

- **Patrick:** D1 (Arbeit & Essen), D2 (Tools & Waffen), D3 (Crafting dauert Zeit)
- **Omar:** D4 (Expeditionen robust), D5 (Speichern/Laden), D7 (Angriff & Verteidigung)
- **Gemeinsam:** D6 (neue Spezies) – Omar den Beitritt über die Expedition, Patrick Produktion/Crafting
- Ein Branch pro Requirement, Merge in `main` per Pull Request.

D1–D3 drehen sich um Simulation und Forge, D4/D5/D7 um Expeditionen und State.
So arbeiten wir größtenteils in verschiedenen Dateien.

## Teamentscheidungen

| Thema | Entscheidung | Wo im Code |
|---|---|---|
| Wer produziert? | Nur Zwerge mit Job **und** Status `working`. Wer auf Expedition ist, behält den Job, produziert aber nicht. | `isProducing` in `simulation.ts` |
| Wer isst? | Jeder Zwerg isst 1 Ration pro Tag – auch auf Expedition, weil er sich seine Ration mitnimmt. | `dailyMeals` in `simulation.ts` |
| Was passiert bei Hunger? | Reicht das Essen nicht, ist die Kolonie `starving` und am nächsten Tag arbeitet nur die Pilzfarm. Essen wird nie negativ. | `advanceDay`, `isHaltedByHunger` in `simulation.ts` |
| Wie werden Tools gespeichert? | Keine einzelnen Tool-Objekte, sondern: `resources.tools` = Tools im Lager, `dwarf.hasTool` = Zwerg trägt eines. | `types.ts` |
| Wobei hilft ein Tool? | Nur bei Woodcutting und Mining (Axt / Spitzhacke), nicht auf der Pilzfarm. | kommt in D2 Schritt 3 |
| Was kostet eine Waffe? | 2 Holz + 4 Stein. Steinlastiger als ein Tool, damit Mining für die Verteidigung wichtig wird. | kommt in D2 Schritt 4 |

## Log

### Setup (Patrick)
- Starter angeschaut, `npm install`, Tests und Build laufen.
- Ein paar Bugs im Starter gefunden, z. B. Zwerge auf Expedition produzieren
  weiter, Stein kann beim Schmieden negativ werden, nach einer gescheiterten
  Expedition bleibt der Zwerg für immer "away".
- `AGENTS.md` angelegt, damit wir auf jedem Rechner denselben Kontext haben.
  `.claude/` ins `.gitignore`. Branches heißen `D1`–`D7`.

### D1 – Schritt 1: Nur anwesende Arbeiter produzieren (Patrick)

**Problem:** `advanceDay` hat nur geprüft, ob ein Zwerg einen Job hat, aber nicht,
ob er überhaupt da ist. Wer auf Expedition war, hat also gleichzeitig weiter Holz
gehackt. Der Shift Ledger in `ColonyPage.tsx` hatte außerdem eine eigene Kopie
derselben Rechnung mit demselben Fehler.

**Lösung:** In `simulation.ts` gibt es jetzt `isProducing(dwarf)` (Job + Status
`working`) und `dailyProduction(dwarves)`, die die Tagesproduktion zusammenrechnet.
Der Job bleibt während einer Expedition gespeichert, damit der Zwerg danach
einfach weiterarbeitet. `advanceDay` und der Ledger verwenden beide
`dailyProduction` – damit können Anzeige und Simulation nicht mehr voneinander
abweichen. Im Ledger steht jetzt "at work" statt "assigned".

### D1 – Schritt 2: Essensverbrauch festgelegt (Patrick)

Wir haben entschieden, dass auch Zwerge auf Expedition essen – sie nehmen sich
ihre Ration für den Weg mit. Im Starter war das zufällig schon so
(`state.dwarves.length`), aber man hat nicht gesehen, dass es Absicht ist.

Jetzt gibt es dafür `FOOD_PER_DWARF` und `dailyMeals(dwarves)` in `simulation.ts`,
die wieder von `advanceDay` und vom Ledger verwendet werden. Unter "Net food
after meals" steht ein kurzer Hinweis, der die Regel erklärt.

### D1 – Schritt 3: Hunger hat eine Konsequenz (Patrick)

**Problem:** Im Starter wurde das Essen mit `Math.max(0, …)` einfach auf 0
gehalten. Hunger hatte keine Folgen und man hat ihn kaum bemerkt.

**Entscheidung:** Hungert die Kolonie, arbeitet nur noch die Pilzfarm, Holz und
Stein liefern 0. Wir hatten auch überlegt, dass alle nur halb so viel produzieren,
aber da müsste man runden und es ist schwerer zu erklären. So ist die Regel
eindeutig und der Ausweg klar: mehr Leute auf die Farm.

**Wie ein Tag jetzt abläuft (`advanceDay`):**
1. Produktion berechnen. Hat die Kolonie am Vortag gehungert, produzieren nur
   die Farmer.
2. Produktion ins Lager.
3. Essen ausgeben. Reicht es, wird abgezogen und der Hunger ist vorbei. Reicht
   es nicht, wird der Rest gegessen, Essen ist 0 und `starving` wird `true`.

Die Strafe wirkt also am nächsten Tag – am Abend merkt man, dass es nicht
gereicht hat, und am nächsten Tag haben die Zwerge keine Kraft für Holz und Stein.

**Code:**
- `types.ts`: `ColonyState` hat ein neues Feld `starving`. Das gehört zum
  Spielzustand, weil es die Produktion des nächsten Tages bestimmt.
- `simulation.ts`: `isHaltedByHunger(job, starving)` entscheidet, ob ein Job
  gerade stillsteht. `dailyProduction` bekommt `starving` als Parameter.
- `ColonyProvider.tsx`: Ein `useEffect` merkt sich mit `useRef` den letzten Wert
  von `starving` und schreibt einen Chronicle-Eintrag, wenn der Hunger beginnt
  oder endet. Das steht absichtlich nicht in `advanceDay`, weil die Funktion
  pure bleiben soll – React kann State-Updater im StrictMode doppelt ausführen,
  dann gäbe es doppelte Einträge.
- UI: rotes Banner im `Layout.tsx` (damit es auf Colony und Forge sichtbar ist),
  rote Rations-Kachel in der `ResourceBar`, im Ledger "Halted – hunger" bei
  gestoppten Jobs und im Roster der Status "hungry".

### D1 – Schritt 4: Eine Tätigkeit pro Zwerg, auch in der Logik (Patrick)

**Problem:** Mehrere Jobs gleichzeitig gingen nie, weil `assignment` nur ein Wert
ist. Aber `assignDwarf` hat den Status nicht geprüft und einfach `working`
gesetzt. Im UI war das Dropdown für abwesende Zwerge zwar gesperrt, die Regel
stand aber nur dort und nicht in der Logik. Ein Aufruf während einer Expedition
hätte den Zwerg gleichzeitig daheim und unterwegs gemacht.

**Lösung:**
- `simulation.ts`: `canChangeAssignment(dwarf)` erlaubt einen Jobwechsel nur bei
  `idle` oder `working`. Spätere Status wie `crafting` (D3) sind damit automatisch
  gesperrt. `assignJob(state, id, job)` gibt bei einem ungültigen Aufruf einfach
  den unveränderten State zurück.
- `ColonyProvider.tsx`: Ist der Wechsel nicht erlaubt, gibt es eine Warnung in der
  Chronicle. Sonst `setColony(current => assignJob(current, …))` – dabei wird auf
  dem aktuellen State nochmal geprüft.
- `DwarfRoster.tsx`: Das Dropdown nutzt dieselbe Regel, und bei abwesenden Zwergen
  steht "Job paused while away – resumes on return".

Was beim Losschicken einer Expedition passiert (zweimal schicken, Fehlschlag),
gehört zu D4 und macht Omar.

### D1 – Fazit

D1 ist fertig. Ein Zwerg macht jetzt immer nur eine Sache, die Anzeige im Ledger
rechnet mit denselben Funktionen wie die Simulation, und wenn das Essen ausgeht,
merkt man das deutlich – nur die Farm arbeitet weiter, bis wieder alle satt sind.

### D2 – Schritt 1: Datenmodell für Tools und Waffen (Patrick)

Bevor man Tools ausrüsten kann, muss klar sein, wo ein Tool "liegt". Wir haben
uns gegen eine Liste einzelner Tools mit IDs entschieden und es so einfach wie
möglich gehalten: Ein Tool ist entweder im Lager (`resources.tools`) oder bei
einem Zwerg (`hasTool: true`). Damit kann ein Tool gar nicht bei zwei Zwergen
gleichzeitig sein, und ein Zwerg kann nicht zwei Tools haben. Die Gesamtzahl
der Tools ist immer Lager + Zwerge mit Tool.

- `types.ts`: `Dwarf` hat `hasTool`, `Resources` hat `weapons`. Waffen gehören
  der Kolonie und werden niemandem zugewiesen (für die Verteidigung in D7).
- `ColonyProvider.tsx`: Startzustand mit `weapons: 0` und `hasTool: false` bei
  allen Zwergen. Das eine Start-Tool liegt im Lager.
- `simulation.ts`: `weapons` beim Aufsummieren mitgenommen.
- `ResourceBar.tsx`: neue Kachel "Weapons", die Tool-Kachel heißt jetzt "Tools in
  store", damit klar ist, dass ausgerüstete Tools dort nicht mitzählen.
