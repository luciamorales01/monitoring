import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from 'react';
import {
  badgeBase,
  inputBase,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  tableCardBase,
  tableCellBase,
  tableHeaderCellBase,
  toneStyles,
  uiTheme,
} from '../theme/commonStyles';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonSizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    minHeight: 34,
    padding: '0 12px',
    fontSize: 12,
  },
  md: {
    minHeight: 40,
    padding: '0 16px',
    fontSize: 13,
  },
};

const buttonVariantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: primaryButtonBase,
  secondary: secondaryButtonBase,
  danger: {
    ...secondaryButtonBase,
    borderColor: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  ghost: {
    border: '1px solid transparent',
    background: 'transparent',
    color: uiTheme.colors.primary,
    boxShadow: 'none',
    fontWeight: 600,
  },
};

export function Button({
  children,
  size = 'md',
  style,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      style={{
        ...buttonVariantStyles[variant],
        ...buttonSizeStyles[size],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: uiTheme.radii.sm,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.62 : 1,
        transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'aside' | 'div' | 'section';
  padding?: 'sm' | 'md' | 'lg' | 'none';
};

const cardPadding: Record<NonNullable<CardProps['padding']>, CSSProperties['padding']> = {
  sm: 16,
  md: 20,
  lg: 24,
  none: 0,
};

export function Card({
  as: Element = 'section',
  children,
  padding = 'md',
  style,
  ...props
}: CardProps) {
  return (
    <Element
      style={{
        ...surfaceCard,
        padding: cardPadding[padding],
        ...style,
      }}
      {...props}
    >
      {children}
    </Element>
  );
}

type BadgeTone = keyof typeof toneStyles;

export function Badge({
  children,
  dot = false,
  style,
  tone = 'slate',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  dot?: boolean;
  tone?: BadgeTone;
}) {
  return (
    <span
      style={{
        ...badgeBase,
        background: toneStyles[tone].background,
        color: toneStyles[tone].color,
        ...style,
      }}
      {...props}
    >
      {dot ? <span style={styles.badgeDot} /> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  title: string;
}) {
  return (
    <div style={styles.emptyState}>
      <strong style={styles.emptyTitle}>{title}</strong>
      {children ? <p style={styles.emptyCopy}>{children}</p> : null}
      {action ? <div style={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

export function SectionHeader({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  title: string;
}) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {children ? <p style={styles.sectionSubtitle}>{children}</p> : null}
      </div>
      {actions ? <div style={styles.sectionActions}>{actions}</div> : null}
    </div>
  );
}

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  wrapperStyle?: CSSProperties;
};

export function Table({ children, style, wrapperStyle, ...props }: TableProps) {
  return (
    <div style={{ ...styles.tableWrap, ...wrapperStyle }}>
      <table
        style={{
          ...styles.table,
          ...style,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export const tableStyles = {
  card: tableCardBase,
  th: tableHeaderCellBase,
  td: tableCellBase,
};

export function Modal({
  children,
  footer,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="common-modal-title"
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <div>
            <h2 id="common-modal-title" style={styles.modalTitle}>
              {title}
            </h2>
            {subtitle ? <p style={styles.modalSubtitle}>{subtitle}</p> : null}
          </div>
        </div>
        {children}
        {footer ? <div style={styles.modalFooter}>{footer}</div> : null}
      </div>
    </div>
  );
}

export const fieldStyles = {
  label: {
    display: 'grid',
    gap: 7,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
  },
  input: {
    ...inputBase,
    width: '100%',
    boxSizing: 'border-box',
  },
} satisfies Record<string, CSSProperties>;

const styles: Record<string, CSSProperties> = {
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: uiTheme.radii.pill,
    background: 'currentColor',
  },
  emptyState: {
    display: 'grid',
    placeItems: 'center',
    gap: 8,
    padding: '32px 20px',
    color: uiTheme.colors.muted,
    textAlign: 'center',
  },
  emptyTitle: {
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  emptyCopy: {
    maxWidth: 420,
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
  },
  emptyAction: {
    marginTop: 6,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
  },
  sectionSubtitle: {
    margin: '6px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  sectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'rgba(15, 23, 42, 0.42)',
  },
  modal: {
    ...surfaceCard,
    width: 'min(560px, 100%)',
    padding: 24,
  },
  modalHeader: {
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  modalSubtitle: {
    margin: '7px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
    flexWrap: 'wrap',
  },
};
