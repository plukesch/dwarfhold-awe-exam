import { describeRaid } from "../game/raid";
import type { RaidReport } from "../types";

// D7: The banner stays for a few days after an attack, so the player
// notices it even if they were on another page. The full history is in the
// chronicle.
const SHOW_FOR_DAYS = 3;

interface Props {
  raid: RaidReport | null;
  today: number;
}

export function RaidBanner({ raid, today }: Props) {
  if (!raid || today - raid.day >= SHOW_FOR_DAYS) return null;

  return (
    <section
      className={raid.defended ? "raid-banner defended" : "raid-banner"}
      role="status"
    >
      <b>{raid.defended ? "🛡️" : "⚔️"}</b>
      <div>
        <strong>
          {raid.defended
            ? `Day ${raid.day}: the lecturers were driven off`
            : `Day ${raid.day}: the lecturers raided Stonehome`}
        </strong>
        <p>They followed the scout home from HCW. {describeRaid(raid)}</p>
      </div>
    </section>
  );
}
