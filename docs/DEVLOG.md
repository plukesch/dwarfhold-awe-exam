# Dev-Log Dwarfhold

Laufende Notizen von Patrick & Omar – Grundlage fürs Exam-Diary.

## Aufteilung

- **Patrick:** D1 (Arbeit & Essen), D2 (Tools & Waffen), D3 (Crafting dauert Zeit)
- **Omar:** D4 (Expeditionen robust), D5 (Speichern/Laden), D7 (Angriff & Verteidigung)
- **D6 (neue Spezies):** gemeinsam besprochen und entschieden, Omar hat es
  umgesetzt und committet. Dabei wurden auch Patricks Dateien angepasst (siehe
  D6 – Schritt 4/5).
- Ein Branch pro Requirement, Merge in `main` per Pull Request.

D1–D3 drehen sich um Simulation und Forge, D4/D5/D7 um Expeditionen und State.
So arbeiten wir größtenteils in verschiedenen Dateien.

**Zeitlicher Ablauf:** Patrick hatte am Freitag Zeit, Omar am Wochenende.
Darum hat Patrick am Fr 20.11. D1–D3 fertig gemacht, Omar am Sa 21.11. D4, D5
und D7 auf diesem Stand aufgebaut. D6 kam am Mo 23.11. dazu, danach haben wir
alles gemeinsam durchgesprochen.

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
| Was passiert bei einem Fehlschlag? | Der Zwerg kommt sofort ohne Beute zurück und arbeitet in seinem alten Job weiter. Das gilt für jeden Fehler: gesperrte Route, Server nicht erreichbar, unlesbare Antwort, Timeout. | `failExpedition`, `api.ts` |
| Wie lange warten wir auf die Antwort? | Höchstens 8 Sekunden (der Server braucht maximal 5). Danach gilt die Expedition als gescheitert. | `EXPEDITION_TIMEOUT_MS` in `api.ts` |
| Expedition und Refresh? | Nach einem Refresh ist der Request weg. Alle Reisenden kommen **ohne Beute** zurück – wie bei jedem anderen Fehlschlag. So bringt Refreshen nie zusätzliche Beute. | `resumeAfterRefresh` in `game/persistence.ts` |
| Schmiede und Refresh? | Der Auftrag läuft einfach weiter, weil er an Spieltagen hängt und nicht an einem Request. Das Material ist schon bezahlt. | `resumeAfterRefresh` (lässt `forgeTask` unverändert) |
| Was wird gespeichert? | Der ganze `ColonyState` mit Versionsnummer. Chronicle und Pause nicht – die Chronicle ist nur ein Log, und nach dem Laden läuft das Spiel wieder. | `serializeSave` in `game/persistence.ts` |
| Kaputter oder alter Spielstand? | Wird komplett ignoriert, es startet eine neue Kolonie. Kein "halb laden". | `parseSave` in `game/persistence.ts` |
| Welches Ziel löst den Angriff aus? | **HCW** – bringt 6 Holz + 4 Nahrung, aber die **Lektoren** folgen dem Zwerg nach Hause. | `hostile: true` in `destinations` (`game/expeditions.ts`), `server/index.js` |
| Wann greifen die Lektoren an? | Sofort bei der erfolgreichen Rückkehr, nachdem die Beute gebucht ist. Ein Fehlschlag (auch durch Refresh) löst nie einen Angriff aus. Auch während der Pause. | `completeExpedition` in `game/expeditions.ts` |
| Ab wann verteidigt sich Stonehome? | Ab **3 Waffen** im Lager. | `RAID_DEFENSE_THRESHOLD` in `game/raid.ts` |
| Verbraucht die Verteidigung Waffen? | Ja, **1 Waffe bricht** pro abgewehrtem Angriff. | `WEAPONS_LOST_ON_DEFENSE` in `game/raid.ts` |
| Was wird geplündert? | Ohne Verteidigung nehmen die Lektoren **die Hälfte (abgerundet)** von Holz, Stein und Nahrung. Fest berechnet, nie negativ. Tools und Waffen nehmen sie nicht. | `raidLoot` in `game/raid.ts` |
| Welche neue Spezies? | **Lecturer**: Leon Freudenthaler, ein Lektor, der aus der HCW geflohen ist und sich in der Crystal Cave versteckt. | `newcomer` in `game/newcomer.ts` |
| Wann tritt er bei? | Bei der **ersten erfolgreichen** Rückkehr aus der **Crystal Cave**, nur einmal. Ein Fehlschlag (auch durch Refresh) findet ihn nie. Er kommt ohne Job und ohne Tool. | `welcomeNewcomer`, `completeExpedition` |
| Was produziert er? | Deep Mining **4 Stein** (Zwerg 2), Woodcutting nur **1 Holz** (Zwerg 3), Mushroom Farm nur **2 Essen** (Zwerg 4). | `speciesRules` in `game/species.ts` |
| Was kann er an der Schmiede? | **Keine Tools** (Einschränkung), dafür eine **Waffe in 2 statt 3 Tagen** (Fähigkeit). | `cannotForge`, `forgeDays` in `game/species.ts` |
| Welche Regeln gelten sonst für ihn? | Alle wie für Zwerge: isst 1 Ration, ein Status zur Zeit, kann ein Tool tragen (+1 bei Holz/Stein), auf Expedition gehen, Hunger stoppt ihn, wird gespeichert. | Er steht im selben `dwarves`-Array |

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

### D4 – Schritt 3: Expeditionen im Provider eingebaut (Omar)

**Problem:** `sendExpedition` im Starter hat den Status direkt umgeschrieben,
nichts geprüft und bei einem Fehler den Zwerg nicht zurückgeholt. Belohnungen
wurden ungeprüft addiert, und `expeditionPending` war ein globaler Wert für alle.

**Lösung:** `sendExpedition` ruft jetzt nur noch die reinen Funktionen aus
Schritt 2 auf:
1. `expeditionProblem` auf dem aktuellen Render-State – bei einem Problem kommt
   der Grund als Warnung in die Chronicle, sonst geht es los.
2. Eigene Id mit `crypto.randomUUID()` (der Zufall bleibt im Provider, die
   Spiellogik bleibt deterministisch).
3. `setColony(current => departExpedition(current, id, …))` – auf dem
   *aktuellen* State wird nochmal geprüft.
4. Antwort da → `completeExpedition`, Fehler → `failExpedition`. Beide nur über
   `setColony(current => …)`, also nie mit veraltetem State.

**Doppelklick:** Zwei Klicks, bevor React neu rendert, sehen beide noch den
alten State. Der zweite `departExpedition` würde zwar nichts ändern (Zwerg ist
schon unterwegs), aber es gäbe einen zweiten Request und ein doppeltes
"departed" in der Chronicle. Deshalb merkt sich ein `useRef`-Set `departing`,
für welche Zwerge gerade ein Request läuft. Ein Ref ändert sich sofort, nicht
erst beim nächsten Render. Im `finally` wird der Zwerg wieder entfernt.

**`expeditionPending` ist weg.** Ob man losschicken kann, entscheidet jetzt
`expeditionProblem` pro Zwerg – mehrere Zwerge können gleichzeitig reisen.
`sendExpedition` bekommt als Ziel den Typ `DestinationId` statt `string`.

**Falscher Tag in der Chronicle:** `log()` hat den Tag aus `colony.day` des
Renders genommen, in dem die Funktion erzeugt wurde. Nach einem `await` ist das
der Tag der *Abreise* – kam die Antwort nach einem Tageswechsel zurück, stand
in der Chronicle ein alter Tag. Jetzt merkt sich ein Ref `today` den aktuellen
Tag, und `log()` liest daraus (kleine Änderung an Patricks Helper). Der Effect
dafür steht als erster im Provider, damit die anderen Effects (Hunger, Schmiede)
schon mit dem neuen Tag loggen.

Außerdem kommt die Chronicle-Id nicht mehr vom Server (`exp-17` …), die nach
einem Server-Neustart wieder von vorne zählt und doppelte React-Keys erzeugt
hätte.

### D4 – Schritt 4: Timeout und Antwortprüfung in `api.ts` (Omar)

**Problem:** `beginExpedition` hat nur den Normalfall abgedeckt:
- Läuft die API nicht, liefert der Vite-Proxy eine HTML-Fehlerseite.
  `response.json()` ist dann selbst abgestürzt, und in der Chronicle stand eine
  technische Meldung wie "Unexpected token '<'".
- Hängt der Server, hätte der Zwerg ewig auf die Antwort gewartet.
- Was der Server geschickt hat, wurde ungeprüft als `ExpeditionResult` behandelt.

**Lösung:**
- **Timeout:** `AbortSignal.timeout(8000)`. Der Server antwortet nach höchstens
  5 Sekunden, 8 Sekunden lassen also genug Luft. Danach gilt die Expedition als
  gescheitert und der Zwerg kommt ohne Beute zurück.
- `readJson` liest den Body und gibt `null` zurück, wenn es kein JSON ist.
- `isExpeditionResult` prüft die Form der Antwort (`expeditionId`, `status`,
  `message`, `rewards` als Objekt). Die einzelnen Mengen prüft weiterhin
  `addRewards` beim Buchen – zwei Stellen, weil das eine die Form der Antwort
  ist und das andere eine Spielregel ("Lager wird nie negativ").
- Jeder Fehlerfall wird zu einem `Error` mit lesbarem Text. Der Provider muss
  deshalb nur einen Fall kennen: `catch` → `failExpedition`.

**Tests:** `src/api.test.ts` ersetzt `fetch` mit `vi.stubGlobal`, braucht also
keinen laufenden Server. Getestet: Erfolg, Fehlertext vom Server, HTML-Fehlerseite,
falsche Form, Netzwerkfehler, Timeout.

### D4 – Schritt 5: Expeditions-Panel (Omar)

Das Panel steht jetzt in einer eigenen Komponente `ExpeditionPanel.tsx`. Vorher
war es in `ColonyPage.tsx` direkt neben Patricks Shift Ledger – so arbeiten wir
nicht mehr in derselben Datei.

- **Nur verfügbare Zwerge:** Im Scout-Dropdown sind beschäftigte Zwerge
  ausgegraut, mit Grund dahinter ("on the road", "at the forge").
- **Button:** gesperrt, sobald `expeditionProblem` einen Grund findet – dieselbe
  Funktion, die auch der Provider verwendet. Der Grund steht unter dem Button.
- **Ziele** kommen aus `destinations`, unter dem Dropdown steht die Beschreibung.
- **"On the road":** Liste aller laufenden Expeditionen mit Zwerg, Ziel und
  Abreisetag (⚒️, wenn das Tool mitreist).
- **Regeltext:** mehrere gleichzeitig, aber jeder Zwerg nur einmal; unterwegs
  keine Arbeit, aber Essen; Tool reist mit ohne Bonus; Fehlschlag = ohne Beute
  zurück; Pause hält Reisen nicht an.

**Im Browser getestet:** Doppelklick auf "Send" → nur eine Abreise in der
Chronicle. Dori (Crystal Cave) und Yrsa (Blocked Pass) gleichzeitig unterwegs →
Dori bringt +8 Stein und +1 Tool genau einmal, Yrsa kommt ohne Beute zurück und
arbeitet wieder. Läuft die API nicht, kommt der Zwerg mit "Expedition failed
(500)" zurück.

### D4 – Fazit

D4 ist fertig. Ein Zwerg auf Expedition ist sichtbar unterwegs und kann in der
Zeit nichts anderes tun. Jede Expedition hat eine eigene Id, und das Ergebnis
wird nur gebucht, solange diese Id noch in `colony.expeditions` steht – so gibt
es die Belohnung genau einmal. Jeder Fehler (Route gesperrt, Server weg,
Timeout, kaputte Antwort) bringt den Zwerg ohne Beute zurück. Doppelklicks und
mehrere gleichzeitige Expeditionen erzeugen keinen widersprüchlichen Zustand.

**Für D5:** `expeditions` muss gespeichert werden. Nach einem Refresh gibt es die
laufenden Requests nicht mehr – dafür brauchen wir eine Regel (Vorschlag: alle
Reisenden kommen ohne Beute zurück, über `failExpedition`).
**Für D7/D6:** Überfall und neue Spezies hängen sich an den Erfolgsfall
(`completeExpedition`), damit ein Fehlschlag sie nie auslöst.

### D5 – Schritt 1–3: Speichern, Prüfen und Refresh-Regel als reine Funktionen (Omar)

D5 verlangt drei Dinge: Der Spielstand übersteht einen Refresh, kaputte oder
alte Daten fallen sicher zurück, und es gibt eine sichtbare Regel für
Expeditionen und Schmiede-Aufträge, die ein Refresh unterbricht.

Wie bei D4 steht zuerst die Logik in einer eigenen Datei
`src/game/persistence.ts` – ohne `localStorage` und ohne React. Die Funktionen
bekommen Text rein und geben Text bzw. State raus, dadurch kann man sie ohne
Browser testen. Eingebaut wird das im nächsten Schritt.

**Speichern:** `serializeSave(colony)` schreibt `{ version, colony }` als JSON.
`SAVE_VERSION` ist 1. Ändert sich später die Form von `ColonyState` (z. B. mit
der neuen Spezies in D6), erhöhen wir die Zahl – ein alter Spielstand passt dann
nicht mehr und wird sicher ignoriert, statt halb geladen zu werden.

**Laden:** `parseSave(raw)` gibt einen `ColonyState` zurück oder `null`. `null`
heißt immer: neue Kolonie. Geprüft wird in zwei Stufen:
1. **Form:** Ist es JSON? Stimmt die Version? Sind alle Felder da und haben den
   richtigen Typ? Ressourcen und Tage müssen ganze Zahlen ≥ 0 sein. Status, Job,
   Rezept und Ziel müssen bekannte Werte sein.
2. **Widersprüche:** Die richtigen Typen reichen nicht. Ein Spielstand, in dem
   ein Zwerg `expedition` hat, aber nicht in `expeditions` steht, würde den
   Zwerg für immer festhalten – genau der Starter-Bug aus D4. Deshalb gelten
   beim Laden dieselben Regeln wie im Spiel: Jeder reisende Zwerg hat genau
   eine Expedition und umgekehrt, `crafting` gibt es genau dann, wenn ein
   Schmiede-Auftrag läuft (und es ist dessen Schmied), keine doppelten Ids.

Die Prüfung ist von Hand geschrieben und nicht mit einer Bibliothek wie zod.
Das sind ein paar kleine Funktionen (`isDwarf`, `isForgeTask`, …), die man
Zeile für Zeile erklären kann, und wir brauchen keine neue Abhängigkeit.

**Refresh-Regel:** `resumeAfterRefresh(colony)` wird nach dem Laden aufgerufen.
- Jede laufende Expedition geht über `failExpedition` aus D4: Der Zwerg kommt
  ohne Beute zurück und arbeitet in seinem Job weiter, das Tool hat er dabei.
  Der Request von vor dem Refresh ist weg, seine Antwort kann nie ankommen.
  Den Request neu zu schicken haben wir verworfen – dann könnte man durch
  Refreshen an Beute kommen, und es wäre deutlich mehr Code.
- Ein Schmiede-Auftrag bleibt einfach stehen und wird an seinem Tag fertig.
  Er hängt an `completesOnDay`, nicht an einem Request, es geht also nichts
  verloren. Verloren gehen höchstens die Sekunden bis zum nächsten Tag.
- Die Funktion gibt außerdem die Namen der Zurückgekehrten zurück, damit der
  Provider sie in die Chronicle schreiben kann.

**Nicht gespeichert:** die Chronicle (nur ein Log) und die Pause. Einen
"New game"-Button gibt es nicht, weil D5 ihn nicht verlangt – zum Testen reicht
`localStorage.clear()` in der Browser-Konsole.

**Tests:** `game/persistence.test.ts` mit 12 Tests. Der Test-State ist eine
Kolonie, in der gerade alles gleichzeitig passiert (ein Zwerg unterwegs mit
Tool, einer in der Schmiede, einer zu Hause). Pro Test wird genau eine Sache
kaputt gemacht: fehlendes Feld, negative Ressource, unbekannter Status,
Widerspruch zwischen Status und Liste, andere Version, kein JSON. Dazu:
Speichern und Laden ergibt denselben State, Reisende kommen ohne Beute zurück,
ein Schmiede-Auftrag wird nach dem Laden normal fertig.

### D5 – Schritt 4: Provider lädt beim Start und speichert jede Änderung (Omar)

Nur `src/state/ColonyProvider.tsx` hat sich geändert, die Spielregeln nicht.

- **Laden:** `loadGame()` liest den Spielstand und prüft ihn mit `parseSave`.
  Es gibt drei Fälle: nichts gespeichert → neue Kolonie wie bisher; kaputt oder
  alte Version → neue Kolonie plus Warnung in der Chronicle; gültig →
  `resumeAfterRefresh`, Chronicle meldet "Stonehome restored on day X" und
  welche Reisenden ohne Beute zurückkamen. Aufgerufen wird es mit
  `useState(loadGame)` (die Funktion, nicht `loadGame()`), damit React es nur
  beim ersten Render ausführt.
- **Speichern:** ein `useEffect` auf `colony` schreibt nach jeder Änderung
  (jeder Tag, jede Aktion). Eine einzige Stelle – eine neue Aktion kann das
  Speichern also nicht vergessen.
- **Robust:** `localStorage` kann werfen (gesperrt im Privatmodus, voll).
  `readSave`/`writeSave` fangen das ab, das Spiel läuft dann ohne Speichern weiter.
- Die Refs `today`, `wasStarving`, `previousTask` starten mit dem geladenen
  State → nach einem Refresh erscheinen keine doppelten Hunger-Meldungen.

**Browser-Test:** Refresh direkt nach "Send expedition" → Zwerg zu Hause, keine
Beute (auch nicht, als die alte Server-Antwort fällig gewesen wäre), Chronicle-
Eintrag da. Refresh während eines Waffen-Auftrags → wird am geplanten Tag fertig.
Refresh beim Hungern → keine doppelte Meldung. `dwarfhold-save` = "kaputt" →
neue Kolonie mit Warnung, keine Fehler in der Konsole.

**Bekannte Grenze:** In zwei Tabs gleichzeitig gewinnt der letzte Speichervorgang.
Nicht verlangt, deshalb bewusst nicht gelöst.

### D5 – Schritt 5–6: Regeln in der UI und Abschluss (Omar)

Jede Teamentscheidung aus D5 steht jetzt auch im Spiel:
- **Expeditions-Panel:** Regeltext ergänzt – ein Refresh bricht alle Reisen ab,
  die Zwerge kommen ohne Beute zurück.
- **Forge-Seite** (`ForgePage.tsx`, Patricks Datei – nur eine Zeile, im PR
  erwähnt): ein laufender Auftrag übersteht einen Refresh und wird an seinem
  Tag fertig.
- **Footer** (`Layout.tsx`): "💾 Saved automatically", Tooltip erklärt, dass im
  Browser gespeichert wird und ein unlesbarer Spielstand neu startet.

Die übrigen Entscheidungen sieht man in der Chronicle beim Start ("Stonehome
restored …", "… returns empty-handed", "The old records were unreadable …").

**Geprüft:** 79 Tests und Build grün; die Texte im Browser sichtbar, Footer
bleibt einzeilig. Die Refresh-Fälle wurden schon in Schritt 4 im Browser getestet.

**Für D6:** Sobald die neue Spezies `ColonyState` oder `Dwarf` ändert, muss
`SAVE_VERSION` erhöht und `isDwarf`/`isColony` in `persistence.ts` angepasst werden.

### D7 – Schritt 1: Neues Ziel HCW (Omar)

D7 braucht ein Ziel, dessen Erfolg Stonehome verändert. Wir nennen es **HCW**:
Dort gibt es gute Vorräte (+6 Holz, +4 Nahrung), aber die Lektoren folgen dem
Zwerg nach Hause und greifen an (ab Schritt 2/3).

- `types.ts`: `DestinationId` um `"hcw"` erweitert.
- `game/expeditions.ts`: Eintrag in `destinations` mit neuem optionalem Feld
  `hostile: true`. So steht an **einer** Stelle, welches Ziel einen Angriff
  auslöst – die Raid-Logik fragt später nur `destinations[...].hostile` ab und
  kennt keine Ziel-Namen. Die Beschreibung warnt den Spieler schon im Dropdown.
- `server/index.js`: Antwort für `hcw`. Ohne sie gäbe der Server 404 und jede
  Reise dorthin würde scheitern.
- D5 musste nicht angepasst werden: `parseSave` prüft Ziele über
  `isDestination`, das kennt `hcw` automatisch. Die Form von `ColonyState`
  ändert sich nicht, deshalb bleibt `SAVE_VERSION` bei 1.

**Tests:** 2 neue in `expeditions.test.ts` (Abreise nach HCW, nur HCW ist
`hostile`), 81 grün, Build grün. Server-Antwort per `curl` geprüft.

### D7 – Schritt 2: Angriff als reine Funktionen (Omar)

Neue Datei `src/game/raid.ts`, noch nicht ans Spiel angeschlossen (Schritt 3).

- `RAID_DEFENSE_THRESHOLD = 3`, `WEAPONS_LOST_ON_DEFENSE = 1`,
  `LOOTED_RESOURCES = wood, stone, food` – die Teamentscheidungen stehen als
  Konstanten oben in der Datei, so findet man sie sofort und die UI kann
  dieselben Zahlen anzeigen.
- `canDefend(resources)`: genug Waffen im Lager?
- `raidLoot(resources)`: die Hälfte, abgerundet. Abrunden heißt, es wird nie
  mehr genommen als da ist → Ressourcen können nicht negativ werden.
- `resolveRaid(state)` → `{ colony, report }`: entweder Verteidigung (eine Waffe
  bricht, sonst nichts) oder Plünderung (Beute wird abgezogen). Der `report`
  (`RaidReport` in `types.ts`: Tag, verteidigt ja/nein, verlorene Waffen, Beute)
  ist das, was später im Banner und in der Chronicle angezeigt wird.
- Kein Zufall: gleiche Kolonie → gleiches Ergebnis. Das verlangt D7
  ("deterministic selection") und macht die Regel testbar.

**Tests:** `game/raid.test.ts`, 7 Tests – genau an der Schwelle und eine Waffe
darunter, Verteidigung kostet eine Waffe, Plünderung rechnet richtig ab, leeres
Lager bleibt bei 0, deterministisch, die übergebene Kolonie wird nicht verändert.
88 grün, Build grün.

### D7 – Schritt 3: Der Angriff kommt bei der Rückkehr (Omar)

- `ColonyState.lastRaid: RaidReport | null` – der letzte Angriff (oder `null`).
  Er liegt im State, damit die Anzeige (Schritt 5) einfach den State liest und
  `resolveRaid` eine reine Funktion bleibt. Deshalb gibt `resolveRaid(state)`
  jetzt direkt die neue Kolonie mit gesetztem `lastRaid` zurück (statt
  `{ colony, report }` aus Schritt 2) – ein Ergebnis, eine Stelle.
- `completeExpedition`: erst wird die Beute gebucht und der Zwerg ist zu Hause,
  dann – nur wenn `destinations[...].hostile` – `resolveRaid`. Die Lektoren
  plündern also auch die frische HCW-Beute.
- Warum die Regeln aus D7 automatisch halten:
  - **Fehlschlag → kein Angriff:** der Angriff steht nur in
    `completeExpedition`. `failExpedition` (Serverfehler, Timeout, Refresh)
    kommt gar nicht daran vorbei.
  - **Nur ein Angriff pro Reise:** unbekannte Id (Ergebnis kommt doppelt) →
    `completeExpedition` gibt den State unverändert zurück, vor dem Angriff.
- `lastRaid: null` in allen Test-Kolonien ergänzt, auch in Patricks
  `forge.test.ts`, `tools.test.ts`, `simulation.test.ts` (je eine Zeile) und im
  `initialState` des Providers.

**Tests:** 5 neue in `expeditions.test.ts` – mit 3 Waffen verteidigt, mit 2
geplündert (inkl. frischer Beute), Fehlschlag ohne Angriff, doppeltes Ergebnis
greift nur einmal an, andere Ziele greifen nicht an.

### D7 – Schritt 4: Angriff wird mitgespeichert (Omar)

`lastRaid` ist neu in `ColonyState` → die Form des Spielstands hat sich
geändert → `SAVE_VERSION` von 1 auf **2**. Ein Spielstand von vor D7 wird damit
sauber abgelehnt (neue Kolonie mit Hinweis), statt ohne `lastRaid` halb zu laden.

- `persistence.ts`: `isRaidReport` prüft Tag, `defended`, `weaponsLost` und die
  Beute (nur bekannte Ressourcen, ganze Zahlen ≥ 0). `lastRaid` darf `null` sein.
- Refresh während einer HCW-Reise: läuft über `failExpedition` → kein Angriff.

**Tests:** 3 neue in `persistence.test.ts` (kaputter Raid-Bericht, alter
Version-1-Spielstand, abgebrochene HCW-Reise ohne Angriff). 96 grün, Build grün.

**Browser-Test:** Version-1-Spielstand in `localStorage` → "The old records were
unreadable", neue Kolonie. HCW mit 0 Waffen → Holz 23 → 12, Stein 11 → 6
(Hälfte weg), `lastRaid` steht im Spielstand. Noch keine Anzeige – kommt in Schritt 5.

### D7 – Schritt 5: Angriff und Regeln sichtbar (Omar)

D7 verlangt, dass Ergebnis und Wirkung **klar sichtbar** sind und die
Waffen-Regel kommuniziert wird. Alle Zahlen kommen aus den Konstanten in
`game/raid.ts` – ändert sich eine Regel, ändert sich auch der Text.

- **Vor der Entscheidung** (`ExpeditionPanel.tsx`): ist HCW gewählt, zeigt das
  Panel "🗡️ 2 / 3 weapons – Stonehome would be looted!" bzw. "…would drive them
  off". Der Regeltext unten erklärt Schwelle, gebrochene Waffe, Plünderung und
  dass ein Fehlschlag nie einen Angriff auslöst.
- **Im Lager** (`ResourceBar.tsx`): Waffen-Kachel zeigt "3 needed to defend"
  oder "ready to defend".
- **Nach dem Angriff:**
  - `components/RaidBanner.tsx` (neu): rotes Banner bei Plünderung, grünes bei
    Verteidigung, mit Tag und genauer Beute. Bleibt 3 Spieltage stehen, damit
    man es auch auf der Forge-Seite sieht. Eingebunden in `Layout.tsx`.
  - Chronicle: `useEffect` auf `colony.lastRaid` im Provider (gleiches Muster
    wie "forge finished"). Der Ref startet mit dem geladenen Wert → nach einem
    Refresh wird ein alter Angriff nicht noch einmal gemeldet.
  - `describeRaid(report)` in `raid.ts` baut den Satz für Banner und Chronicle
    ("…carried off 15 wood, 7 stone and 2 food", Nullen weggelassen). Reine
    Funktion, 3 Tests.

`ResourceBar.tsx` und `Layout.tsx` sind gemeinsame Dateien – je nur eine
kleine Ergänzung.

### D7 – Schritt 6: Browser-Test und Fazit (Omar)

Durchgespielt im Browser:
1. **Plünderung:** 0 Waffen, Vorschau "0 / 3 – would be looted!". Nach der
   Rückkehr: rotes Banner + Chronicle "carried off 15 wood, 7 stone and 2 food".
   Die Nahrung war danach leer → am nächsten Tag Hunger (D1). Die Folge des
   Angriffs wirkt also auch auf die Simulation.
2. **Fehlschlag:** Request scheitert ("gate stayed shut") → `lastRaid` und
   Ressourcen unverändert, kein Angriff.
3. **Verteidigung:** 3 Waffen, Vorschau "3 / 3 – would drive them off". Nach der
   Rückkehr: grünes Banner, Waffen 3 → 2, nichts geplündert.
4. **Refresh:** Banner bleibt (gespeichert), Chronicle meldet den Angriff
   nicht doppelt. Keine Fehler in der Konsole.

**Fazit D7:** Die ganze Regel steckt in zwei reinen Funktionen
(`completeExpedition` ruft `resolveRaid`), der Provider meldet nur. Dass ein
Fehlschlag nie angreift, folgt aus dem Aufbau aus D4 und braucht keinen
Extra-Code. 99 Tests, Build grün.

### D6 – Vorbemerkung

D6 kam zeitlich nach D7, weil es auf D4 (Rückkehr), D5 (Speichern) und D7
(HCW als Herkunft der Lektoren) aufbaut. Spezies, Beitrittsziel und die Regeln
für Leon haben wir gemeinsam festgelegt, Omar hat programmiert und committet.

### D6 – Schritt 1: Spezies als Grundlage (Omar)

- `types.ts`: `Species = "dwarf" | "lecturer"` und Pflichtfeld
  `Dwarf.species`. Der Typ heißt weiter `Dwarf` (wird überall benutzt), ein
  Kommentar erklärt, dass seit D6 auch Nicht-Zwerge darin stehen.
- Warum im selben Array statt einer eigenen Liste: Alle bestehenden Regeln
  (Essen, Status, Tools, Expeditionen, Speichern, Konsistenzprüfung) gelten so
  automatisch für den Neuen. Wir bauen nur die **Unterschiede** ein.
- Pflichtfeld statt optional: keine versteckte Regel "fehlt = Zwerg".
- `species: "dwarf"` im `initialState` und in allen Test-Fixtures (auch
  Patricks Tests, je eine Zeile).

**Tests:** 99 grün, Build grün.

### D6 – Schritt 2: Leon tritt per Expedition bei (Omar)

Neue Datei `src/game/newcomer.ts`:
- `NEWCOMER_DESTINATION = "crystal-cave"`, `newcomer` = Leon mit fester id
  `lecturer-1` (kein Zufall → deterministisch).
- `hasNewcomerJoined(state)`: gibt es schon einen Lecturer? "Nur einmal" wird
  **abgeleitet** statt als eigenes Flag gespeichert – so können Flag und Liste
  sich nie widersprechen.
- `welcomeNewcomer(state)`: hängt Leon an, wenn er noch nicht da ist, sonst
  unveränderter State.
- `completeExpedition` ruft es bei der Crystal Cave auf – gleiches Muster wie
  der Angriff aus D7: nur bei Erfolg, `failExpedition` kommt nie dorthin.
  Doppeltes Ergebnis → unbekannte Id → unverändert, also nie ein zweiter Leon.

**Tests:** 7 neue in `expeditions.test.ts` (Beitritt, nur einmal, doppeltes
Ergebnis, Fehlschlag, anderes Ziel, `welcomeNewcomer` unverändert, er isst ab
dem nächsten Tag mit). 106 grün.

### D6 – Schritt 3: Leon wird gespeichert (Omar)

Neues Pflichtfeld in jedem Bewohner → Form des Spielstands geändert →
`SAVE_VERSION` von 2 auf **3**. Ein Spielstand von D7 wird abgelehnt (neue
Kolonie mit Hinweis).

- `isDwarf` prüft `species` (nur bekannte Spezies).
- `isConsistent`: höchstens **ein** Lecturer (die "nur einmal"-Regel gilt auch
  beim Laden).
- Refresh während einer Crystal-Cave-Reise: `failExpedition` → kein Leon.

**Tests:** 4 neue in `persistence.test.ts` (Leon wird gespeichert, unbekannte
Spezies / zweiter Lecturer, Version-2-Save, abgebrochene Reise bringt ihn
nicht). 110 grün.

### D6 – Schritt 4: Eigene Produktion und Schmiede (Omar)

Neue Datei `src/game/species.ts`: Tabelle `speciesRules` mit allem, was sich
zwischen den Spezies unterscheidet (`production`, `cannotForge`, `forgeDays`).
Was für alle gleich ist, steht bewusst nicht darin.

- `simulation.ts` (Patrick): `productionOf(dwarf)` liefert die Produktion je
  nach Spezies; `dailyProduction` benutzt sie. Tool-Bonus und Hunger laufen
  unverändert darüber → gelten automatisch auch für Leon. `production` bleibt
  als Export für den Shift Ledger und zeigt auf die Zwergen-Zahlen.
- `forge.ts` (Patrick): `canForgeRecipe` (Leon: kein Tool), `forgeDays`
  (Spezies-Tage oder `recipe.days`). `forgeProblem` lehnt ab → `startForging`
  gibt den State unverändert zurück, nichts wird bezahlt.
- Provider: "ready on day …" rechnet mit `forgeDays`.

**Tests:** 4 in `simulation.test.ts`, 4 in `forge.test.ts`. 118 grün.

### D6 – Schritt 5: Leon in der UI (Omar)

D6 verlangt, dass die Unterschiede sichtbar genug sind, um gut zu entscheiden.

- **Roster** (`DwarfRoster.tsx`, Patrick): Jede Job-Option zeigt, was **dieser**
  Bewohner dort produziert ("Deep Mining (+4 🪨)"). Leon hat ein blaues
  LECTURER-Badge, ein blaues Porträt und einen Erklärtext (`note` in
  `speciesRules`).
- **Schmiede** (`ForgePage.tsx`, Patrick): Tage und Sperre hängen am gewählten
  Schmied – bei Leon ist das Tool gesperrt (mit Grund), die Waffe zeigt "⏱ 2 days"
  in Blau. Fortschrittsbalken rechnet mit den echten Tagen. Regeltext ergänzt.
- **Expedition** (`ExpeditionPanel.tsx`): bei der Crystal Cave "Someone seems to
  be hiding…", danach "Leon … already lives in Stonehome". Regeltext ergänzt.
- **Chronicle**: Effekt im Provider (gleiches Muster wie beim Angriff), Ref
  startet mit dem geladenen Wert → nach Refresh kein doppelter Eintrag.
- `ColonyPage.tsx` (Patrick): ein Satz im Essens-Regeltext.

**Browser-Test:** Dori in die Crystal Cave → Chronicle "Leon … joins
Stonehome!", Hinweis wechselt. Leons Karte zeigt +1/+4/+2. Refresh: Leon noch
da, kein doppelter Eintrag, Save-Version 3. Schmiede mit Leon: Tool gesperrt,
Waffe 2 Tage, fertig an Tag 16 (Start Tag 14). Keine Fehler in der Konsole.

### D6 – Schritt 6: Doku und Fazit (Omar)

Teamentscheidungen oben in der Tabelle, `AGENTS.md` aktualisiert.

**Fazit D6:** Der Neue steht im selben Array wie die Zwerge, deshalb gelten
alle Regeln aus D1–D5/D7 ohne Extra-Code. Die Unterschiede stehen an einer
Stelle (`speciesRules`), der Beitritt hängt – wie der Angriff – nur an
`completeExpedition`. "Nur einmal" wird aus den Bewohnern abgeleitet und beim
Laden geprüft. 118 Tests, Build grün.

### Abschluss (Patrick & Omar) – Mo 23.11.

Nach D6 haben wir uns zusammengesetzt und alles gemeinsam genau
durchgesprochen – vor allem die Stellen, an denen unsere Teile ineinandergreifen
(`isAtHome`, `completeExpedition`, `speciesRules` in Patricks Dateien), damit
jeder von uns auch den Teil des anderen erklären kann.

Stand: D1–D7 sind in `main`. Die Qualitätsziele
stehen in `docs/QUALITY.md`, das Diary für die Abgabe in `docs/DIARY.md`.
