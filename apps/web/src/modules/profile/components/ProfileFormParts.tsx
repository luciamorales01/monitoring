import type { ReactNode } from 'react';
import { styles } from '../profileStyles';

export function SectionCard({
  children,
  title,
  subtitle,
  badge,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <section
      style={styles.formCard}
      className="profile-surface profile-sectionCard"
    >
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardSubtitle}>{subtitle}</p>
        </div>

        <span style={styles.statusChip}>{badge}</span>
      </div>

      {children}
    </section>
  );
}

export function Field({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label
      style={{ ...styles.field, ...(wide ? styles.fieldWide : {}) }}
      className="profile-field"
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function MetaRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={styles.metaRow} className="profile-metaRow">
      <span style={styles.metaIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function SwitchRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={styles.switchRow} className="profile-switchRow">
      <span style={styles.switchIcon}>{icon}</span>
      <span style={styles.switchText}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={styles.switchInput}
      />
    </label>
  );
}


