# Development Diary - Dwarfhold

Praktische Prüfung Advanced Web Engineering, Gruppe A

**Team:** Patrick Lukesch, Omar Gharsalli
**Repository:** https://github.com/plukesch/dwarfhold-awe-exam

Ausführliche Notizen zu jedem Schritt stehen in `docs/DEVLOG.md`, unsere
Qualitätsziele in `docs/QUALITY.md`.

---

## 1. Entwicklungsüberblick

### Wie wir gearbeitet haben

- Zum Start hat Patrick das Repository aufgesetzt und den Starter nach Fehlern
  durchsucht, auf die die Requirements abzielen (z. B. Zwerge auf Expedition
  produzieren weiter, Stein wird beim Schmieden negativ, nach einer gescheiterten
  Expedition bleibt der Zwerg für immer weg).
- `AGENTS.md` hält fest, wer was macht, die Git-Regeln, die Architekturregeln und
  alle bereits umgesetzten Spielregeln. So hatten wir auf jedem Rechner denselben
  Stand. `docs/DEVLOG.md` haben wir nach jedem Schritt ergänzt (Problem, Lösung,
  Entscheidung).
- Git: `main` ist der Integrationsbranch. Für jedes Requirement gibt es einen eigenen
  Branch (`D1` … `D7`), pro Teilschritt einen Commit mit deutscher Message, und
  gemergt wird per Pull Request. Vor jedem neuen Branch haben wir `main`
  gepullt, weil spätere Requirements auf früheren aufbauen.
- Gemeinsame Architekturregeln: Spielregeln sind reine Funktionen, der Provider
  verbindet nur, eine ungültige Aktion ändert nichts, und jede Regel wird im UI
  erklärt.
- Vor jedem PR haben wir `npm test` und `npm run build` laufen lassen und den Schritt
  im Browser durchgespielt.

### Aufteilung

| Wer | Requirements | Wann |
|---|---|---|
| Patrick | D1 Arbeit & Essen, D2 Tools & Waffen, D3 Schmieden braucht Zeit | Fr 20.11. |
| Omar | D4 Expeditionen, D5 Speichern/Laden, D7 Angriff & Verteidigung | Sa 21.11. |
| beide | D6 neue Spezies (Omar hat programmiert und committet) | Mo 23.11. |

**Warum so?** Inhaltlich gehören D1–D3 zur Simulation und Schmiede, D4/D5/D7 zu
Expeditionen und State. So haben wir großteils in verschiedenen Dateien gearbeitet.
Zeitlich hatte Patrick am Freitag Zeit und am Wochenende kaum, bei Omar war es
umgekehrt. Deshalb hat Patrick seinen Teil am Freitag fertig gemacht und gemergt,
und Omar konnte am Wochenende direkt darauf aufbauen. Zum Beispiel verwendet seine
Expeditions-Regel dieselbe Funktion `isAtHome` wie die Schmiede.

D6 wollten wir zusammen machen. Die Entscheidungen (Spezies, Ziel, Regeln) haben wir
gemeinsam getroffen, programmiert und committet hat Omar. Am Montag haben wir uns
zusammengesetzt und alles genau durchgesprochen, damit jeder auch den Teil des
anderen erklären kann. Dieses Diary basiert auf diesem Treffen, dem DEVLOG und der
Git-Historie.

### Nicht umgesetzt

Alle Requirements D1–D7 sind umgesetzt und in `main` gemergt (118 Tests, Build grün).
Bewusste Grenzen: Alte Spielstände werden bei einer Formänderung verworfen statt
migriert, zwei offene Tabs überschreiben sich gegenseitig, und es gibt keinen
„New game“-Button.

---

## 2. Wichtige Entscheidungen

Alle Teamentscheidungen stehen in der Tabelle am Anfang von `docs/DEVLOG.md`. Hier
die wichtigsten:

### 1. Spielregeln als reine Funktionen
Im Starter stand die Logik direkt im React-Provider (`craftTool`, `sendExpedition`).
Wir haben jede Regel in eine reine Funktion `(state, eingabe) => neuerState`
verschoben (`simulation.ts`, `game/*.ts`). Der Provider ruft sie nur mit
`setColony(current => …)` auf. Vorteile: ohne Browser testbar, deterministisch, und
eine ungültige Aktion kann einfach den unveränderten State zurückgeben. Meldungen
zu Ereignissen aus der Simulation (Hunger, Schmiede fertig, Angriff, Leon) kommen
aus `useEffect`, damit die Regeln frei von Seiteneffekten bleiben.

### 2. Hunger: am nächsten Tag arbeitet nur die Pilzfarm (D1)
Reicht das Essen nicht, wird der Rest gegessen, Essen bleibt bei 0 und die Kolonie
ist `starving`. Am nächsten Tag liefern Holz und Stein nichts. Verworfen haben wir
„alle produzieren halb so viel“, weil man dann runden muss und die Regel schwerer zu
erklären ist. So ist sie eindeutig, und der Ausweg ist klar: mehr Leute auf die Farm.

### 3. Ein Datenmodell, in dem Fehler gar nicht möglich sind (D2, D3)
Tools sind keine Objekte mit Id. Ein Tool liegt entweder im Lager
(`resources.tools`) oder bei einem Zwerg (`hasTool: true`). Damit kann ein Tool nicht
bei zwei Zwergen sein, und keiner kann zwei haben. Genauso ist `forgeTask` ein
einzelnes Feld statt einer Liste, weil es nur eine Schmiede gibt. Das Material wird
beim Start des Auftrags bezahlt, ein ungültiger Versuch ändert gar nichts.

### 4. Eigene Id pro Expedition (D4)
Statt eines globalen `expeditionPending` hat jede Reise einen Eintrag mit einer Id,
die wir beim Aufbruch selbst erzeugen. Ein Ergebnis wird nur gebucht, solange die Id
noch in der Liste steht, danach wird sie entfernt. Doppelte oder verspätete Antworten
ändern dadurch nichts. Jeder Fehler (Route gesperrt, Server weg, Timeout nach 8 s,
kaputte Antwort) bringt den Zwerg ohne Beute zurück. Das Tool reist mit.

### 5. Speichern mit Version und Prüfung, klare Refresh-Regel (D5)
Gespeichert wird der ganze `ColonyState` mit Versionsnummer. Beim Laden prüfen wir
Form und Widersprüche, bei jedem Problem startet eine neue Kolonie mit Hinweis. Nach
einem Refresh kommen Reisende ohne Beute zurück, weil der Request weg ist. Den
Request neu zu schicken haben wir verworfen, sonst könnte man durch Refreshen Beute
bekommen. Ein Schmiede-Auftrag läuft weiter, weil er an Spieltagen hängt.

### 6. Angriff nur nach erfolgreicher Rückkehr aus HCW (D7)
Das Ziel HCW ist als `hostile` markiert. Der Angriff hängt nur am Erfolgsfall
(`completeExpedition`), ein Fehlschlag kann ihn also nie auslösen. Ab 3 Waffen
verteidigt sich Stonehome, und dabei bricht eine Waffe. Sonst nehmen die Angreifer
die Hälfte (abgerundet) von Holz, Stein und Essen, und zwar nach der Beute, also auch
die frische Beute.

### 7. Der Lektor Leon steht im selben Array wie die Zwerge (D6)
Leon bekommt keine eigene Liste, sondern ein Feld `species`. Dadurch gelten Essen,
Status, Tools, Expeditionen und Speichern automatisch auch für ihn. Nur die
Unterschiede stehen in `speciesRules`: Bergbau 4, Holz 1, Farm 2, keine Tools
schmieden, Waffe in 2 statt 3 Tagen. Er tritt nach der ersten erfolgreichen Reise in
die Crystal Cave bei. „Nur einmal“ wird aus den Bewohnern abgeleitet, es gibt kein
eigenes Flag.

---

## 3. KI-Nutzung

**Wie:** Wir haben Claude Code als Coding-Assistenten im Projekt verwendet. Damit die
KI auf jedem Rechner denselben Kontext hat, steht alles Wichtige in `AGENTS.md`
(`CLAUDE.md` verweist darauf). Der Ablauf war meistens so: Wir haben die Regel und
die Teamentscheidung festgelegt und den Schritt beschrieben. Die KI hat Code und
Tests vorgeschlagen bzw. umgesetzt. Wir haben den Code durchgesehen, Tests und Build
laufen lassen, im Browser getestet und selbst committet, sobald die Änderungen gepasst haben. In `AGENTS.md` steht
ausdrücklich, dass die KI nicht committet oder pusht.

Außerdem haben wir KI verwendet, um Fehler im Starter zu finden, uns Code erklären zu
lassen, Texte wie das DEVLOG zu formulieren und für jeden von uns ein privates
Lerndokument zu erstellen (nicht im Repository).

**Warum:** Wir hatten jeweils nur ein bis zwei Tage. Mit der KI konnten wir
schneller umsetzen und trotzdem bei jedem Schritt Tests mitschreiben. Weil in der
Prüfung keine KI erlaubt ist, haben wir darauf geachtet, dass der Code einfach
bleibt und wir jede Zeile erklären können.

**Erfahrungen:** Die Entscheidungen mussten von uns kommen. Die KI setzt um, was man
beschreibt, aber ob z. B. ein Tool auf der Farm helfen soll, muss man selbst
festlegen. Manche Fehler sind erst beim eigenen Testen im Browser aufgefallen, z. B.
dass Farmer ein Tool nehmen konnten, das ihnen nichts bringt.

---

## 4. Reflexion und Lessons Learned

**Was gut funktioniert hat:**
- Die reinen Funktionen und Tests haben das Zusammenführen leicht gemacht. Omars
  Expeditionen nutzen dieselbe Regel `isAtHome` wie die Schmiede, und Leon hat alle
  bestehenden Regeln automatisch übernommen.
- Ein gut gewähltes Datenmodell spart Prüfungen. Viele Fehler (Tool bei zwei Zwergen,
  zwei Schmiede-Aufträge, doppelte Belohnung) können gar nicht entstehen.
- Ein Branch und ein PR pro Requirement machen den Verlauf gut nachvollziehbar.

**Was schwierig war:**
- Asynchroner Code mit React-State: veraltete Werte nach einem `await`, Doppelklicks
  vor dem nächsten Render, verspätete Antworten. Gelöst haben wir das mit
  `setColony(current => …)`, der Expedition-Id und Refs (`departing`, `today`).
- Speichern war einfach, sicheres Laden deutlich mehr Arbeit (Version, Form,
  Widersprüche).
- Gemeinsame Dateien (`types.ts`, `ColonyProvider.tsx`, Test-Fixtures). Für D6
  musste Omar auch in Patricks Dateien arbeiten.

**Was wir anders machen würden:**
- Kleinere Commits mit besseren Messages. Ein paar Commits fassen mehrere Schritte
  zusammen (z. B. D3-Abschluss plus Bugfix, D7-Schritt 3 und 4).
- D6 wirklich zu zweit programmieren statt nur gemeinsam zu planen.
- Früher festlegen, wer gemeinsame Dateien wie `types.ts` ändert.

**Lessons Learned:**
- Ungültige Zustände möglichst schon im Datenmodell ausschließen.
- Daten von außen (Server, `localStorage`) zur Laufzeit prüfen, weil TypeScript-Typen
  dann nicht mehr existieren.
- Anzeige und Simulation aus derselben Funktion berechnen, dann können sie nicht
  auseinanderlaufen.
- Das DEVLOG nach jedem Schritt zu schreiben hat sich gelohnt. Damit war dieses
  Diary schnell geschrieben.
