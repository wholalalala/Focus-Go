import { useI18n } from "../i18n";

/** Fixed, code-owned stimuli. No animation or AI-generated response cues. */
export function TaskScene({
  kind,
  symbol,
  visible,
}: {
  kind: "GNG" | "SA";
  symbol: string;
  visible: boolean;
}) {
  const { t } = useI18n();
  if (kind === "GNG") {
    const go = visible && symbol === "green-light";
    const stop = visible && symbol === "red-light";
    return (
      <svg
        className="task-scene traffic-scene"
        viewBox="0 0 480 240"
        role="img"
        aria-label={t(go ? "greenLight" : stop ? "redLight" : "waitingSignal")}
        data-scene="traffic"
      >
        <rect x="1" y="1" width="478" height="238" rx="26" fill="#edf5ed" />
        <path d="M24 152h432" stroke="#b9ceb8" strokeWidth="2" />
        <path
          d="M65 150v-24m-12 11h24M413 150v-31m-14 14h28"
          stroke="#95b28b"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M0 175h480v39H0z" fill="#d4ded6" />
        <path
          d="M20 195h440"
          stroke="#fffefb"
          strokeWidth="3"
          strokeDasharray="25 18"
        />
        <rect x="308" y="38" width="74" height="129" rx="22" fill="#2e4540" />
        <rect x="337" y="167" width="16" height="22" rx="3" fill="#2e4540" />
        <circle cx="345" cy="76" r="25" fill={stop ? "#e36b5d" : "#41564f"} />
        {stop && <path d="M333 64h24v24h-24z" fill="#fffefb" rx="3" />}
        <circle cx="345" cy="129" r="25" fill={go ? "#5da575" : "#41564f"} />
        {go && <path d="M330 125h15v-8l16 12-16 12v-8h-15z" fill="#fffefb" />}
        <path d="M116 165l17-30h57l24 30" fill="#739e8c" />
        <path d="M139 142h21v20h-32zm28 0h18l17 20h-35z" fill="#e9f4eb" />
        <rect x="103" y="160" width="125" height="27" rx="10" fill="#497b68" />
        <rect x="212" y="165" width="9" height="7" rx="3" fill="#f6dda1" />
        <circle cx="129" cy="186" r="12" fill="#30463e" />
        <circle cx="202" cy="186" r="12" fill="#30463e" />
        <circle cx="129" cy="186" r="5" fill="#d7e5d9" />
        <circle cx="202" cy="186" r="5" fill="#d7e5d9" />
      </svg>
    );
  }
  const target = visible && symbol === "star";
  return (
    <svg
      className="task-scene space-scene"
      viewBox="0 0 480 240"
      role="img"
      aria-label={t(
        visible ? (target ? "targetStar" : "observationMoon") : "waitingSignal",
      )}
      data-scene="space"
    >
      <rect x="1" y="1" width="478" height="238" rx="26" fill="#24394d" />
      <path
        d="M20 219c61-24 94-15 142 0s86 19 139-1 104-13 159 0"
        stroke="#3b5367"
        strokeWidth="20"
        fill="none"
      />
      {[
        [45, 42],
        [96, 84],
        [421, 54],
        [396, 116],
        [75, 170],
        [437, 182],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="#7e94a6" />
      ))}
      <rect
        x="161"
        y="39"
        width="158"
        height="158"
        rx="28"
        fill="#2d4459"
        stroke="#7997ad"
        strokeWidth="2"
      />
      <path
        d="M181 54h-6v15m130-15h-6m6 0v15M175 167v15h6m118 0h6v-15"
        stroke="#bad0d9"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {visible &&
        (target ? (
          <path
            d="M240 70l15 31 35 5-25 25 6 35-31-16-31 16 6-35-25-25 35-5z"
            fill="#f4d47f"
            stroke="#ffebac"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M255 72a48 48 0 1 0 22 79 43 43 0 0 1-22-79z"
            fill="#bbcfdf"
            stroke="#dae7f0"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ))}
      {!visible && <circle cx="240" cy="118" r="3" fill="#7997ad" />}
      <path
        d="M83 211l12-17 12 17m-24-17h24"
        stroke="#6f899c"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
