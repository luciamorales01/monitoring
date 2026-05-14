import type { ReactNode } from 'react';
import { styles } from '../SectionDetailPage.styles';

export function KpiCard({
  icon,
  iconTone,
  title,
  value,
  note,
  valueTone = "default",
}: {
  icon: ReactNode;
  iconTone: "green" | "blue" | "orange" | "purple";
  title: string;
  value: string | number;
  note: string;
  valueTone?: "default" | "green" | "orange" | "slate";
}) {
  return (
    <article style={styles.kpiCard}>
      <span style={{ ...styles.kpiIcon, ...styles[`kpiIcon${iconTone}`] }}>
        {icon}
      </span>
      <div>
        <span style={styles.kpiTitle}>{title}</span>
        <strong
          style={{
            ...styles.kpiValue,
            ...(valueTone === "green"
              ? styles.valueGreen
              : valueTone === "orange"
                ? styles.valueOrange
                : valueTone === "slate"
                  ? styles.valueSlate
                  : {}),
          }}
        >
          {value}
        </strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </article>
  );
}

export function TrendingGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 16 9 11l4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

