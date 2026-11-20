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
| _wird laufend ergänzt_ | | |

## Log

### 20.11. – Setup (Patrick)
- Starter angeschaut, `npm install`, Tests und Build laufen.
- Bugs im Starter gefunden (siehe `AGENTS.md`), z. B. Zwerge auf Expedition
  produzieren weiter, Stein kann beim Schmieden negativ werden, nach einer
  gescheiterten Expedition bleibt der Zwerg für immer "away".
- `AGENTS.md` angelegt, damit wir (und unsere KI-Tools) auf jedem Rechner
  denselben Kontext haben. `.claude/` ins `.gitignore`.
