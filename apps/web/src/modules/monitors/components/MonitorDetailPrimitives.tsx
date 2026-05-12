import type { Dispatch, SetStateAction } from "react";
import type { MonitorStatus } from "../../../shared/monitorApi";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { Tone } from "./monitorDetailTypes";
import {
  getStatusColor,
  getStatusLabel,
  getStatusSoftBackground,
  getToneBorder,
  getToneColor,
} from "./monitorDetailUtils";

export function KpiCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  tone: Tone;
}) {
  return (
    <div style={{ ...styles.kpiCard, borderColor: getToneBorder(tone) }}>
      <p style={styles.kpiTitle}>{title}</p>
      <strong style={{ ...styles.kpiValue, color: getToneColor(tone) }}>
        {value}
      </strong>
      <span style={styles.kpiDescription}>{description}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: MonitorStatus }) {
  return (
    <span
      style={{
        ...styles.badge,
        background: getStatusSoftBackground(status),
        color: getStatusColor(status),
      }}
    >
      <StatusDot status={status} />
      {getStatusLabel(status)}
    </span>
  );
}

export function StatusDot({ status }: { status: MonitorStatus }) {
  return (
    <span
      style={{
        ...styles.statusDot,
        background: getStatusColor(status),
      }}
    />
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong
        style={{
          fontWeight: strong ? 700 : 600,
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: Dispatch<SetStateAction<T>>;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <div style={styles.segmentedControl}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...styles.segmentedButton,
              ...(active ? styles.segmentedButtonActive : null),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function LegendItem({
  status,
  label,
}: {
  status: MonitorStatus;
  label: string;
}) {
  return (
    <span style={styles.legendItem}>
      <StatusDot status={status} />
      {label}
    </span>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return <div style={styles.chartEmpty}>{label}</div>;
}
