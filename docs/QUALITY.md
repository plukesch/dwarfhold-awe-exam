# Qualitätsziele – Dwarfhold

Wir haben vier Qualitätsziele gewählt. Ausschlaggebend war, was bei einem kleinen
Browser-Spiel wirklich zählt, das zwei Leute parallel entwickeln und in der
Prüfung Zeile für Zeile erklären müssen.

1. Korrekter, widerspruchsfreier Spielzustand
2. Verständlicher und leicht änderbarer Code
3. Robustheit gegenüber Fehlern von außen (Server, Browser-Speicher)
4. Nachvollziehbare Regeln für den Spieler

---

## 1. Korrekter, widerspruchsfreier Spielzustand

**Warum:** Fast alle Requirements laufen darauf hinaus: ein Zwerg macht nur eine
Sache, Ressourcen werden nie negativ, ein ungültiger Versuch ändert nichts,
Belohnungen kommen genau einmal. Ist der State einmal falsch, ist das Spiel kaputt,
auch wenn die Oberfläche noch gut aussieht.

**Entscheidungen:**
- Alle Spielregeln sind reine Funktionen `(state, eingabe) => neuerState` in
  `src/simulation.ts` und `src/game/*.ts`. Kein React, kein Zufall, keine Uhrzeit.
  Der `ColonyProvider` verbindet nur State, Timer, API und Chronicle.
- Eine ungültige Aktion gibt **dasselbe** State-Objekt zurück, es wird nie halb
  geändert.
- Das Datenmodell ist so gewählt, dass falsche Zustände gar nicht darstellbar sind:
  `hasTool` ist ein boolean (max. ein Tool pro Zwerg), `forgeTask` ist ein einzelnes
  Feld (max. ein Auftrag), jede Expedition hat eine eigene Id und wird beim Beenden
  aus der Liste entfernt (Belohnung genau einmal).
- State wird nur mit `setColony(current => …)` geändert. Die reine Funktion prüft
  dabei noch einmal auf dem aktuellen State, damit Doppelklicks oder späte
  Server-Antworten nichts kaputt machen.

**Trade-off:** Manche Prüfungen laufen doppelt: einmal im Provider für die Meldung
an den Spieler und einmal in der reinen Funktion als eigentliche Absicherung.

**Wie wir das prüfen:**
- 118 Vitest-Tests auf den reinen Funktionen (`npm test`), vor jedem Pull Request.
  Beispiele: „rewards are booked exactly once, even if the result arrives twice“,
  „not enough materials -> nothing changes“, „a dwarf at the forge cannot leave“,
  „an empty store loses nothing and never goes negative“.
- Bei ungültigen Aktionen prüfen die Tests mit `expect(next).toBe(state)`, dass
  wirklich dasselbe Objekt zurückkommt.
- Jeder Schritt wurde zusätzlich im Browser durchgespielt (siehe `docs/DEVLOG.md`).

---

## 2. Verständlicher und leicht änderbarer Code

**Warum:** In der Prüfung muss jeder von uns den Code finden, erklären und
Änderungen begründen können. Die Lehrenden bewerten verständlichen Code höher als
viel Code. Dazu kommt, dass wir parallel gearbeitet haben und uns nicht gegenseitig
blockieren wollten.

**Entscheidungen:**
- Regeln als Daten an einer Stelle: `recipes` (Schmiede), `destinations`
  (Expeditionsziele), `speciesRules` (Unterschiede Zwerg/Lektor) und Konstanten wie
  `TOOL_BONUS` oder `RAID_DEFENSE_THRESHOLD`. Die UI liest dieselben Werte, Texte und
  Logik können also nicht auseinanderlaufen.
- Eine Datei pro Verantwortung (`tools.ts`, `forge.ts`, `expeditions.ts`,
  `persistence.ts`, `raid.ts`, …). Das Expeditions-Panel wurde in eine eigene
  Komponente verschoben, damit wir nicht beide in `ColonyPage.tsx` arbeiten.
- Keine zusätzlichen Bibliotheken. Die Prüfung des Spielstands ist von Hand
  geschrieben statt mit z. B. zod, und wir verwenden kein `useReducer` oder eine
  State-Library.

**Trade-offs:**
- Der Typ heißt weiter `Dwarf`, obwohl seit D6 auch der Lektor Leon darin steht.
  Umbenennen hätte fast jede Datei betroffen.
- Die erlaubten Werte in `persistence.ts` (Status, Jobs, Spezies) wiederholen die
  TypeScript-Typen, weil es Typen zur Laufzeit nicht gibt.

**Wie wir das prüfen:**
- Änderungsprobe: Für Leon (D6) mussten Essen, Status, Tools, Expeditionen und
  Speichern nicht angepasst werden. Nur die Unterschiede kamen in `speciesRules`
  dazu. Ein Tool-Bonus von +2 wäre eine Zeile (`TOOL_BONUS`).
- `npm run build` macht einen Type-Check. Durch `Record<…>`-Typen meldet der Build,
  wenn z. B. ein Ziel oder eine Spezies in einer Tabelle fehlt.
- Wir sind am Ende den gesamten Code gemeinsam durchgegangen, sodass jeder auch den
  Teil des anderen erklären kann.

---

## 3. Robustheit gegenüber Fehlern von außen

**Warum:** Server und Browser-Speicher haben wir nicht unter Kontrolle. D4 und D5
verlangen ausdrücklich, dass Fehlschläge und kaputte Daten sicher behandelt werden.
Ein Fehler darf nie dazu führen, dass ein Zwerg für immer weg ist oder das Spiel
nicht mehr startet.

**Entscheidungen:**
- `beginExpedition` (`src/api.ts`) hat einen Timeout von 8 Sekunden und macht aus
  jedem Fehler einen lesbaren `Error`: keine Verbindung, Fehlerstatus, Antwort ist
  kein JSON, falsche Form. Der Provider kennt dadurch nur einen Fehlerweg:
  `failExpedition`, und der Zwerg kommt ohne Beute zurück.
- Die Server-Antwort wird zweimal geprüft: die Form in `isExpeditionResult`, die
  Mengen in `addRewards` (nur bekannte Ressourcen, nur positive Zahlen).
- Der Spielstand wird mit Versionsnummer gespeichert. `parseSave` prüft Version,
  Form und Widersprüche (z. B. Zwerg „expedition“ ohne laufende Expedition). Bei
  jedem Problem startet eine neue Kolonie mit Hinweis, es wird nie halb geladen.
- Zugriffe auf `localStorage` stehen in try/catch. Geht Speichern nicht, läuft das
  Spiel trotzdem weiter.

**Trade-offs:**
- Keine Migration: Ändert sich die Form des States, werden alte Spielstände
  verworfen (passiert in D7 und D6).
- Ein Refresh bricht laufende Expeditionen ohne Beute ab. Das ist einfacher, als den
  Request neu zu schicken, und man kann sich durch Refreshen keine Beute erschleichen.
- Zwei offene Tabs überschreiben sich gegenseitig. Das war nicht verlangt und wurde
  bewusst nicht gelöst.

**Wie wir das prüfen:**
- `src/api.test.ts` ersetzt `fetch` und testet Fehlerseite ohne JSON, Netzwerkfehler,
  Timeout und falsche Antwort.
- `src/game/persistence.test.ts` macht pro Test genau eine Sache am Spielstand kaputt
  und erwartet `null`. Dazu kommen die Refresh-Fälle (Reise abgebrochen, Schmiede
  läuft weiter).
- Manuell im Browser: API gestoppt, dann kommt der Zwerg mit „Expedition failed
  (500)“ zurück. Mit `localStorage.setItem("dwarfhold-save", "kaputt")` und Reload
  startet eine neue Kolonie mit Warnung. Refresh während einer Expedition und während
  eines Schmiede-Auftrags.

---

## 4. Nachvollziehbare Regeln für den Spieler

**Warum:** Die Requirements verlangen mehrmals, dass Regeln im Interface erklärt sind
und Unterschiede „sichtbar genug für eine Entscheidung“ sind. Viele unserer
Teamentscheidungen (Hunger, Tool nur für Holz und Stein, Waffen-Schwelle) sind für
den Spieler sonst nicht erkennbar.

**Entscheidungen:**
- Der Shift Ledger rechnet mit denselben Funktionen wie die Simulation
  (`dailyProduction`, `dailyMeals`). Die Vorschau zeigt also genau das, was am
  nächsten Tag passiert.
- Gesperrte Buttons und Optionen zeigen den Grund an („Tools only help woodcutters
  and miners“, „at the forge“, „Leon … cannot forge a tool“).
- Vor einer Entscheidung sieht man die Folgen: Waffen-Vorschau bei HCW, Menge pro Job
  im Dropdown je Bewohner, Dauer pro Rezept je Schmied.
- Nach einem Ereignis gibt es ein Banner (Hunger, Angriff) und einen
  Chronicle-Eintrag.

**Trade-off:** Mehr Text in der Oberfläche, vor allem der Regeltext im
Expeditions-Panel ist lang.

**Wie wir das prüfen:** Die Teamentscheidungen-Tabelle in `docs/DEVLOG.md`
durchgehen und für jede Entscheidung im Spiel nachsehen, wo der Spieler sie erfährt
(Regeltext, Tooltip, Vorschau, Banner oder Chronicle). Eine Entscheidung, die nur im
Code steht, zählt als nicht erfüllt.

---

## Bewusst nicht gewählt

- **Performance:** Der State ist winzig (3–4 Bewohner, ein Tag alle 8 Sekunden).
  Optimierungen hätten den Code nur schwerer lesbar gemacht.
- **Security:** Es ist ein lokales Einzelspieler-Spiel ohne Accounts. Relevant ist
  nur, Daten von außen zu prüfen, und das deckt Ziel 3 ab.
- **Accessibility** nur in den Grundlagen: native Buttons und Selects, `role="alert"`
  bzw. `role="status"` bei Bannern, Informationen nicht nur über Farbe. Nicht
  systematisch getestet.
