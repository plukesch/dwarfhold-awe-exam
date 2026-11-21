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
| Wobei hilft ein Tool? | +1 pro Tag, aber nur bei Woodcutting und Mining (Axt / Spitzhacke). Nur Holzfäller und Miner können ein Tool nehmen. Wechselt ein Zwerg mit Tool auf die Farm oder wird unassigned, geht das Tool automatisch zurück ins Lager. | `getsToolBonus`, `canEquipTool`, `assignJob` |
| Was kostet eine Waffe? | 2 Holz + 4 Stein. Steinlastiger als ein Tool, damit Mining für die Verteidigung wichtig wird. | `recipes` in `game/forge.ts` |
| Wie lange dauert Schmieden? | Tool 2 Tage, Waffe 3 Tage. | `days` in `recipes` (`game/forge.ts`) |
| Wie viele Aufträge gleichzeitig? | Nur einer – Stonehome hat genau eine Schmiede. | `forgeTask` in `types.ts` |
| Wann wird das Material abgezogen? | Beim Start. Der Zwerg holt sich die Materialien aus dem Lager und geht damit zur Schmiede. | `startForging` in `game/forge.ts` |
| Wer darf schmieden? | Jeder Zwerg, der zu Hause ist (`idle` oder `working`). Wer unterwegs ist oder schon schmiedet, nicht. | `canForge` in `game/forge.ts` |
| Tool auf Expedition? | Das Tool bleibt beim Zwerg und reist mit. Unterwegs bringt es keinen Bonus (er ist nicht `working`), nach der Rückkehr wirkt es sofort wieder. | `hasTool` bleibt unverändert (D4) |
| Mehrere Expeditionen gleichzeitig? | Ja – jeder Zwerg, der zu Hause ist, kann los. Ein Zwerg kann aber nur auf einer Expedition sein. | `ColonyState.expeditions` (Liste) |
| Pause und Expedition? | Eine Expedition ist ein Request in Echtzeit und läuft auch bei pausierter Kolonie weiter. | `sendExpedition` im Provider |

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

### D2 – Schritt 2: Tools ausrüsten und zurückgeben (Patrick)

Ausrüsten und Zurückgeben verschieben ein Tool nur zwischen Lager und Zwerg,
die Gesamtzahl bleibt also immer gleich.

- Neue Datei `src/game/tools.ts` mit den Funktionen `equipTool` (Lager −1, Zwerg
  bekommt das Tool) und `returnTool` (umgekehrt). Ist der Aufruf ungültig – Lager
  leer, Zwerg hat schon ein Tool, Zwerg ist unterwegs –, kommt der unveränderte
  State zurück. So bleibt das Inventar immer konsistent.
- Damit "Zwerg ist zu Hause" nicht an mehreren Stellen steht, gibt es dafür jetzt
  `isAtHome` in `simulation.ts`. `canChangeAssignment` aus D1 verwendet das auch.
- `ColonyProvider.tsx`: neue Aktionen `equipToolTo` und `returnToolFrom` mit
  Chronicle-Eintrag. Weil sich der Code für Chronicle-Einträge ständig wiederholt
  hat, gibt es dafür jetzt eine kleine Hilfsfunktion `log(message, tone)`.
- UI: Im Roster hat jeder Zwerg einen Button "Equip tool" bzw. "Return tool",
  und wer ein Tool trägt, hat ein ⚒️ neben dem Namen. Der Button ist gesperrt,
  wenn das Lager leer ist oder der Zwerg unterwegs ist. In der Ressourcenleiste
  steht unter "Tools in store" zusätzlich, wie viele gerade ausgerüstet sind.

### D2 – Schritt 3: Tools bringen +1 Produktion (Patrick)

Ein ausgerüstetes Tool bringt jetzt eine Einheit mehr pro Tag: Holz 3 → 4,
Stein 2 → 3. Wir haben festgelegt, dass das nur bei Woodcutting und Mining gilt,
weil Axt und Spitzhacke auf der Pilzfarm nichts bringen. So hat das "compatible
local job" aus dem Requirement auch wirklich eine Bedeutung.

- `simulation.ts`: `TOOL_BONUS`, `TOOL_JOBS` und `getsToolBonus(dwarf)`. Der Bonus
  wird direkt in `dailyProduction` dazugerechnet. Dadurch gelten automatisch die
  Regeln von D1 mit: Wer unterwegs ist oder wessen Job wegen Hunger steht, bekommt
  auch keinen Bonus.
- Die Logik steht in `simulation.ts` und nicht in `game/tools.ts`, weil
  `tools.ts` schon `simulation.ts` importiert und es sonst einen Kreis-Import gäbe.
- Shift Ledger: Jede Job-Kachel zeigt jetzt die echte Tagesmenge inklusive Bonus
  (wieder über `dailyProduction`), wie viele davon ein Tool haben, und darunter
  "3 per dwarf, +1 with tool" bzw. "tools don't help" bei der Farm.
- Roster: Unter einem Zwerg mit Tool steht, ob es bei seinem aktuellen Job etwas
  bringt ("Tool: +1 per day on this job") oder nicht.

### D2 – Schritt 4: Waffenrezept und sauberes Schmieden (Patrick)

**Problem:** Die Forge hatte das Tool-Rezept fest in `craftTool` eingebaut und
hat nur geprüft, ob genug Holz da ist. Mit genug Holz, aber zu wenig Stein wurde
der Stein negativ. Für ein zweites Rezept hätte man die ganze Funktion kopieren
müssen.

**Lösung:** Neue Datei `src/game/forge.ts`:
- `recipes` – beide Rezepte als Daten an einer Stelle (Name, Icon, Kosten, in
  welches Lager das Ergebnis kommt). Tool: 3 Holz + 2 Stein, Waffe: 2 Holz + 4 Stein.
- `missingMaterials` gibt zurück, was fehlt, `canAfford` ob alles da ist.
- `craft(state, recipeId)` zieht **alle** Kosten ab und legt das Ergebnis ins Lager.
  Fehlt irgendwas, kommt der unveränderte State zurück – nichts wird halb bezahlt.

Im Provider ersetzt `forge(recipeId)` das alte `craftTool`. Fehlt Material, steht
in der Chronicle genau was ("The forge needs more stone for a weapon").
Die Forge-Seite baut ihre Panels jetzt aus `recipes` – ein weiteres Rezept wäre
also nur ein neuer Eintrag. Buttons sind gesperrt, wenn das Material nicht reicht.

Waffen landen als Ressource im Lager und gehören keinem Zwerg. Wofür sie gebraucht
werden, kommt mit D7 (Verteidigung).

Schmieden passiert in D2 noch sofort. Dass es Zeit und einen Zwerg braucht, ist
D3.

### D2 – Fazit

D2 ist fertig. Tools kann man einem Zwerg geben und wieder zurücknehmen, man sieht
im Roster, wer eines hat, und es bringt bei Holz und Stein +1 pro Tag. Das Lager
bleibt dabei immer stimmig, weil ein Tool nur zwischen Lager und Zwerg verschoben
wird. Die Forge hat jetzt zusätzlich ein Waffenrezept, und Schmieden mit zu wenig
Material ändert nichts mehr.

wird beim nächsten commit rausgenommen, nur drinnen damit push einheitlich wird weil ich vorher etwas verkackt habe 

### D3 – Schritt 1: Datenmodell für Schmiede-Aufträge (Patrick)

D3 verlangt, dass Schmieden Material, einen Zwerg und Zeit braucht. Bisher war
ein Tool sofort fertig. Bevor wir das umbauen, braucht der State die Infos dafür.

Unsere Entscheidungen dazu:
- Ein Tool dauert 2 Tage, eine Waffe 3 Tage.
- Es läuft immer nur ein Auftrag, weil Stonehome nur eine Schmiede hat.
- Das Material wird beim Start abgezogen: Der Zwerg holt sich die Sachen aus dem
  Lager und geht damit zur Schmiede. So kann das Material während der Arbeit
  auch nicht für etwas anderes verwendet werden.

Was im Code dazugekommen ist:
- `types.ts`: neuer Status `crafting` für Zwerge. Neues Interface `ForgeTask` mit
  Rezept, Zwerg und dem Tag, an dem es fertig ist (`completesOnDay`). Im
  `ColonyState` gibt es `forgeTask` – `null` heißt, die Schmiede ist frei. Weil es
  nur ein Feld und keine Liste ist, kann es gar nicht zwei Aufträge geben.
- `RecipeId` ist von `game/forge.ts` nach `types.ts` gewandert, weil `ForgeTask`
  den Typ braucht und `types.ts` sonst aus der Spiellogik importieren müsste.
- `game/forge.ts`: Jedes Rezept hat jetzt `days`. Dazu `isForgeFree(state)`.

Der neue Status passt automatisch zu den Regeln aus D1 und D2, weil dort nur
`idle` und `working` als "zu Hause" gelten: Ein schmiedender Zwerg produziert
nichts für seinen Job, kann den Job nicht wechseln und kein Tool tauschen.
Essen tut er trotzdem.

UI: Auf der Forge-Seite steht oben, ob die Schmiede frei ist, und bei jedem Rezept
die Dauer. Im Footer steht statt dem fixen "Forge: burning" jetzt "free" bzw.
"in use". Der Status-Punkt beim Zwergenbild hat für `crafting` eine eigene Farbe.

Geschmiedet wird in diesem Schritt noch sofort – das Starten mit Zwerg und Dauer
kommt in Schritt 2.

### D3 – Schritt 2: Schmieden starten (Patrick)

Statt sofort ein Item zu bekommen, startet man jetzt einen Auftrag mit einem
Zwerg als Schmied.

**`game/forge.ts`:**
- `canForge(dwarf)` – schmieden darf, wer zu Hause ist. Wer auf Expedition ist
  oder schon schmiedet, fällt raus.
- `forgeProblem(state, recipe, dwarf)` – prüft der Reihe nach: Schmiede frei?
  Zwerg ausgewählt? Zwerg verfügbar? Material da? Gibt den Grund als Text zurück
  oder `null`, wenn alles passt. Den Text verwenden wir direkt für die Chronicle.
- `startForging(state, recipe, dwarf)` – wenn `forgeProblem` nichts findet,
  passiert alles auf einmal: Material wird abgezogen, der Zwerg bekommt den
  Status `crafting`, und `forgeTask` merkt sich Rezept, Zwerg und
  `completesOnDay = heute + Dauer`. Sonst kommt der unveränderte State zurück –
  ein ungültiger Versuch ändert also weder Zwerge noch Ressourcen.
- Die alte Funktion `craft` (sofort fertig) ist weg, weil D3 genau das nicht mehr
  erlaubt.

Der Job des Zwergs bleibt gespeichert, er ruht nur – wie bei einer Expedition.
So kann er nach dem Schmieden einfach weitermachen.

**Kleiner Umbau:** `isAtHome` liegt jetzt in einer eigenen Datei
`game/dwarves.ts`. Grund: In Schritt 3 muss `advanceDay` (in `simulation.ts`)
die Forge-Logik aufrufen. Hätte `forge.ts` gleichzeitig aus `simulation.ts`
importiert, gäbe es einen Kreis-Import. `simulation.ts` exportiert `isAtHome`
weiter, damit bestehende Imports nicht kaputtgehen.

**Provider:** `forge(recipeId, dwarfId)` prüft mit `forgeProblem`, schreibt bei
einem Problem den Grund in die Chronicle und startet sonst mit
`setColony(current => startForging(current, …))`. Weil auf dem aktuellen State
nochmal geprüft wird, kann ein Doppelklick nicht zweimal Material abziehen.

**UI:**
- Forge-Seite: Ist die Schmiede frei, wählt man im Dropdown einen Schmied – dort
  stehen nur Zwerge, die gerade dürfen. Läuft ein Auftrag, steht stattdessen
  "Dori is forging a tool – ready on day 14". Die Buttons sind gesperrt, wenn die
  Schmiede belegt ist, Material fehlt oder niemand verfügbar ist.
- Roster: Beim schmiedenden Zwerg steht "At the forge – job paused until the
  item is done". Dropdown und Tool-Button sind gesperrt.

Fertig wird ein Auftrag erst mit Schritt 3 – bis dahin bleibt der Zwerg in der
Schmiede.

### D3 – Schritt 3: Schmieden abschließen (Patrick)

Jetzt wird ein Auftrag auch fertig.

**`game/forge.ts`:** `finishForging(state)` schaut, ob ein Auftrag läuft und ob
sein Tag erreicht ist. Wenn ja: Das Item kommt ins Lager, der Schmied geht zurück
zu seinem Job (oder auf `idle`, wenn er keinen hatte), und `forgeTask` wird
wieder `null`. Sonst kommt der State unverändert zurück. Weil der Auftrag dabei
gelöscht wird, kann ein Item nicht zweimal gutgeschrieben werden.
Dazu `daysLeft(state)` für die Anzeige.

**`simulation.ts`:** `advanceDay` ruft am Ende `finishForging` für den neuen Tag
auf. Damit läuft alles über die eine Tagesfunktion, genau wie Produktion und
Essen. Ablauf am Beispiel Tool, gestartet an Tag 10:
- Tag 10 → 11: Der Schmied produziert nichts für seinen Job, isst aber.
- Tag 11 → 12: genauso, danach ist Tag 12 erreicht → Tool ins Lager, Schmied
  zurück an die Arbeit.
- Ab Tag 12 → 13 produziert er wieder normal.

Hier hat sich der Umbau aus Schritt 2 (`isAtHome` in eigene Datei) ausgezahlt:
`simulation.ts` importiert jetzt aus `forge.ts`, ohne dass es einen Kreis gibt.

**Chronicle:** Wie beim Hunger merkt sich der Provider mit `useRef` den letzten
Auftrag. Wird `forgeTask` von "Auftrag" zu `null`, schreibt ein `useEffect`
"Bromli finished a weapon – it is now in the store". `advanceDay` bleibt dadurch
eine pure Funktion ohne Seiteneffekte.

**UI:** Auf der Forge-Seite steht jetzt zusätzlich, wie viele Tage noch fehlen,
mit einem kleinen Fortschrittsbalken.

Während eines Hungers wird übrigens weitergeschmiedet – Hunger stoppt laut
unserer D1-Regel nur Holz und Stein, die Schmiede ist kein Job im Ledger.

### D3 – Fazit

D3 ist fertig. Schmieden braucht jetzt Material, einen freien Zwerg und Zeit
(Tool 2, Waffe 3 Tage). Es gibt nur eine Schmiede und damit nur einen Auftrag
gleichzeitig. Das Material geht beim Start weg, der Schmied arbeitet in der Zeit
nicht in seinem Job, und am Ende landet das Item im Lager. Ein ungültiger Versuch
ändert nichts, und im UI sieht man jederzeit, wer schmiedet und wann es fertig ist.

### Fix: Tools auf der Farm und wachsender Roster (Patrick)

Beim Testen sind zwei Fehler aufgefallen:

**Farmer konnten ein Tool nehmen.** `canEquipTool` hat nur geprüft, ob ein Tool
im Lager ist, ob der Zwerg schon eines hat und ob er zu Hause ist – aber nicht,
ob sein Job das Tool überhaupt nutzen kann. Ein Farmer oder ein Zwerg ohne Job hat
damit ein Tool blockiert, das ihm nichts bringt.
- `canEquipTool` prüft jetzt zusätzlich `isToolCompatible(dwarf.assignment)`.
  Der Button ist dann gesperrt und zeigt beim Drüberfahren "Tools only help
  woodcutters and miners".
- Wechselt ein Zwerg mit Tool auf die Farm oder wird unassigned, gibt `assignJob`
  das Tool automatisch ans Lager zurück (mit Eintrag in der Chronicle). Zwischen
  Holz und Stein behält er es. So bleibt kein Tool ungenutzt bei jemandem liegen.

**Der Roster wurde immer länger.** Jede Tool-Aktion schreibt einen Eintrag in die
Chronicle, die rechte Spalte wird dadurch höher. Das Dashboard ist ein CSS-Grid,
und dort werden alle Spalten standardmäßig auf dieselbe Höhe gezogen – der Roster
wurde also mitgestreckt. Mit `align-items: start` behält jedes Panel seine eigene
Höhe. Außerdem hat die Status-Spalte im Roster jetzt eine feste Breite, damit das
Dropdown nicht springt, wenn der Status zwischen IDLE, WORKING und CRAFTING
wechselt.

### D4 – Schritt 1: Datenmodell für laufende Expeditionen (Omar)

**Problem:** Im Starter gab es für Expeditionen nur ein globales
`expeditionPending`. Der State wusste nicht, *welcher* Zwerg *wohin* unterwegs
ist. Deshalb konnte man nicht sicher sagen, ob eine Antwort vom Server noch
gültig ist – eine doppelte oder verspätete Antwort hätte die Belohnung ein
zweites Mal gebucht.

**Entscheidungen** (siehe Tabelle oben):
- Das Tool bleibt beim Zwerg und reist mit. Das passt zu D2: Tools werden nur zu
  Hause getauscht (`canReturnTool` prüft `isAtHome`), und unterwegs gibt es
  ohnehin keinen Bonus, weil der Zwerg nicht `working` ist.
- Mehrere Zwerge dürfen gleichzeitig unterwegs sein.
- Pause hält eine Expedition nicht an, weil sie ein Request in Echtzeit ist.

**Code:**
- `types.ts`: `DestinationId` für die Ziele, `ActiveExpedition` (`id`,
  `dwarfId`, `destination`, `departedOnDay`) und im `ColonyState` die Liste
  `expeditions`. Die `id` erzeugen wir selbst beim Aufbruch. Später wird ein
  Ergebnis nur gebucht, solange diese `id` noch in der Liste steht – danach wird
  sie entfernt. So kann eine Belohnung nicht zweimal gutgeschrieben werden.
- Eine Liste statt einem Feld wie `forgeTask`, weil es nur eine Schmiede gibt,
  aber mehrere Expeditionen gleichzeitig laufen können.
- `ColonyProvider.tsx`: Startzustand mit `expeditions: []`. In Patricks drei
  Test-Dateien steht dieselbe Zeile im Basis-State, damit die Typen stimmen.

Am Spielverhalten ändert sich in diesem Schritt noch nichts.

### D4 – Schritt 2: Expeditionslogik als reine Funktionen (Omar)

Die Regeln für Expeditionen stehen jetzt in einer eigenen Datei
`src/game/expeditions.ts` – ohne React, ohne Zufall, genau wie Patricks
`forge.ts`. Im Spiel ist das noch nicht eingebaut, das kommt in Schritt 3.

**`game/expeditions.ts`:**
- `destinations` – die Ziele als Daten (Name, kurze Beschreibung) für das UI.
  Was man dort findet, entscheidet weiterhin der Server.
- `canSendOnExpedition(dwarf)` – los darf nur, wer zu Hause ist (`isAtHome`).
  Damit kann ein schmiedender Zwerg nicht mehr losgeschickt werden. Vorher wäre
  sein Status von `crafting` auf `expedition` überschrieben worden, und
  `finishForging` hätte ihn später auf `working` gesetzt, obwohl er unterwegs ist.
- `expeditionProblem(state, dwarfId, destination)` – gibt den Grund als Text
  zurück (kein Scout, Zwerg beschäftigt, Ziel unbekannt) oder `null`.
- `departExpedition(state, id, dwarfId, destination)` – Status `expedition`,
  Eintrag in `expeditions`. Job und Tool bleiben beim Zwerg. Ungültig →
  unveränderter State, also kann derselbe Zwerg nicht zweimal losgehen.
- `completeExpedition(state, id, rewards)` – Beute ins Lager, Zwerg zurück an
  seinen Job (oder `idle`), Eintrag aus der Liste entfernt.
- `failExpedition(state, id)` – genauso, nur ohne Beute. Der Zwerg bleibt also
  nie mehr für immer "away".

Beide Rückkehr-Funktionen laufen über `endExpedition`: Steht die `id` nicht
(mehr) in der Liste, kommt der State unverändert zurück. Kommt eine Antwort
doppelt oder kommt nach einem Fehlschlag noch ein Erfolg, wird nichts gebucht.
Außerdem werden nur echte, positive Mengen bekannter Ressourcen gebucht – eine
kaputte Server-Antwort kann das Lager also nicht negativ machen.

**Tests:** `game/expeditions.test.ts` mit 13 Tests, u. a. "Belohnung genau
einmal", "Fehlschlag bringt den Zwerg ohne Beute zurück", "schmiedender Zwerg
darf nicht los" und "unterwegs keine Produktion, aber Essen".
