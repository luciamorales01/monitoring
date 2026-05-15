import type { CSSProperties } from 'react';
import {
  badgeBase,
  inputBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';

export const profileInteractionStyles = `
  .profile-surface {
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .profile-surface:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    border-color: rgba(37, 99, 235, 0.18);
  }

  .profile-tab {
    transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .profile-tab:hover {
    color: ${uiTheme.colors.text};
    transform: translateY(-1px);
    background: rgba(37, 99, 235, 0.04);
  }

  .profile-tab--active {
    box-shadow: inset 0 -1px 0 ${uiTheme.colors.primary};
  }

  .profile-input {
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .profile-input:focus-visible {
    outline: none;
    border-color: ${uiTheme.colors.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  }

  .profile-passwordWrap {
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .profile-passwordWrap:focus-within {
    border-color: ${uiTheme.colors.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  }

  .profile-passwordInput:focus-visible {
    box-shadow: none;
  }

  .profile-passwordWrap .password-toggle {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    color: ${uiTheme.colors.muted};
    background: transparent;
    cursor: pointer;
  }

  .profile-passwordWrap .password-toggle:hover {
    color: ${uiTheme.colors.primary};
    background: rgba(37, 99, 235, 0.08);
  }

  .profile-passwordWrap .password-toggle:focus-visible {
    outline: 2px solid ${uiTheme.colors.primary};
    outline-offset: 2px;
  }

  .profile-primaryButton,
  .profile-secondaryButton,
  .profile-iconButton,
  .profile-action,
  .profile-themeOption {
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .profile-primaryButton:hover,
  .profile-secondaryButton:hover,
  .profile-iconButton:hover,
  .profile-action:hover,
  .profile-themeOption:hover {
    transform: translateY(-1px);
  }

  .profile-tab:focus-visible,
  .profile-primaryButton:focus-visible,
  .profile-secondaryButton:focus-visible,
  .profile-iconButton:focus-visible,
  .profile-action:focus-visible,
  .profile-themeOption:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
  }

  .profile-primaryButton:hover {
    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24);
  }

  .profile-secondaryButton:hover {
    border-color: ${uiTheme.colors.primary};
    color: ${uiTheme.colors.primary};
    background: ${uiTheme.colors.primarySoft};
  }

  .profile-iconButton:hover {
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  }

  .profile-action:hover {
    background: rgba(37, 99, 235, 0.04);
    border-color: rgba(37, 99, 235, 0.12);
    color: ${uiTheme.colors.text};
  }

  .profile-action--danger:hover {
    background: ${uiTheme.colors.dangerSoft};
    color: ${uiTheme.colors.danger};
    border-color: rgba(220, 38, 38, 0.18);
  }

  .profile-themeOption:hover,
  .profile-themeOption--active {
    border-color: ${uiTheme.colors.primary};
    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
  }

  .profile-field:focus-within {
    color: ${uiTheme.colors.primary};
  }

  .profile-metaRow:hover {
    color: ${uiTheme.colors.text};
  }

  .profile-switchRow:hover {
    background: ${uiTheme.colors.surfaceSoft};
  }

  @media (max-width: 1120px) {
    .profile-page-grid {
      grid-template-columns: 1fr;
    }

    .profile-hero {
      grid-template-columns: 1fr;
    }

    .profile-tabs {
      overflow-x: auto;
      padding-bottom: 2px;
    }
  }

  @media (max-width: 760px) {
    .profile-sectionCard {
      padding: 20px !important;
    }

    .profile-field {
      grid-column: 1 / -1 !important;
    }
  }
`;

export const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    overflow: "auto",
    backgroundImage:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)",
  },
  breadcrumbLink: {
    color: uiTheme.colors.muted,
    textDecoration: "none",
  },
  breadcrumbCurrent: {
    color: uiTheme.colors.primary,
    fontWeight: 600,
  },
  loadingCard: {
    ...surfaceCard,
    padding: 24,
    borderRadius: 20,
  },
  pageGrid: {
    display: "grid",
    gap: 18,
  },
  heroCard: {
    ...surfaceCard,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 0.9fr)",
    gap: 22,
    padding: 28,
    borderRadius: 24,
    background: "var(--surface-card)",
    position: "relative",
    overflow: "hidden",
  },
  heroLeft: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
    minWidth: 0,
  },
  heroRight: {
    display: "grid",
    gap: 14,
    alignContent: "center",
  },
  avatarWrap: {
    width: 156,
    height: 156,
    flexShrink: 0,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(145deg, var(--surface) 0%, var(--surface-soft) 100%)",
    border: `1px solid ${uiTheme.colors.border}`,
    color: uiTheme.colors.primary,
    fontSize: 54,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    boxShadow: `inset 0 1px 0 ${uiTheme.colors.border}`,
  },
  identityBlock: {
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
  identityHeader: {
    display: "grid",
    gap: 10,
  },
  identityKicker: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  profileName: {
    margin: 0,
    fontSize: 38,
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: "-0.04em",
  },
  profileRoleDescription: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 620,
  },
  statusChip: {
    ...badgeBase,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    border: `1px solid rgba(37, 99, 235, 0.1)`,
    boxShadow: `inset 0 1px 0 ${uiTheme.colors.border}`,
  },
  identityMeta: {
    display: "grid",
    gap: 12,
    color: uiTheme.colors.muted,
    fontSize: 15,
  },
  metaRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
    width: "fit-content",
  },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  summaryCard: {
    display: "grid",
    gridTemplateColumns: "52px 1fr",
    gap: 14,
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    background: uiTheme.colors.surface,
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
  },
  summaryTitle: {
    margin: "0 0 4px",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  summaryValue: {
    display: "block",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  summaryNote: {
    margin: "5px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.45,
  },
  tabsBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    background: "var(--control-bg)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
    width: "fit-content",
    maxWidth: "100%",
  },
  tabButton: {
    border: "none",
    background: "transparent",
    color: uiTheme.colors.muted,
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 16px",
    cursor: "pointer",
    outline: "none",
    boxShadow: "none",
    borderRadius: 14,
    whiteSpace: "nowrap",
  },
  tabButtonActive: {
    border: "none",
    background: uiTheme.colors.surface,
    color: uiTheme.colors.primary,
    fontWeight: 700,
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.06)",
  },
  contentWrap: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.7fr)",
    gap: 18,
    alignItems: "start",
  },
  contentMain: {
    minWidth: 0,
  },
  sidePanel: {
    display: "grid",
    gap: 18,
    alignContent: "start",
    minWidth: 0,
  },
  formCard: {
    ...surfaceCard,
    padding: 26,
    borderRadius: 24,
    background: "var(--surface-card)",
  },
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  cardTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  cardSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 560,
  },
  profileForm: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 18,
  },
  notificationForm: {
    display: "grid",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 8,
    color: uiTheme.colors.text,
    fontSize: 13,
    fontWeight: 700,
  },
  fieldWide: {
    gridColumn: "1 / -1",
  },
  input: {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    height: 46,
    background: uiTheme.colors.surface,
  },
  passwordInputWrap: {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    height: 46,
    padding: "0 6px 0 16px",
    background: uiTheme.colors.surface,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  passwordInput: {
    border: "none",
    outline: "none",
    width: "100%",
    minWidth: 0,
    height: "100%",
    padding: 0,
    background: "transparent",
    color: uiTheme.colors.text,
    font: "inherit",
  },
  formFooter: {
    gridColumn: "1 / -1",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  formActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  successMessage: {
    color: uiTheme.colors.success,
    fontSize: 13,
    fontWeight: 600,
  },
  footerHint: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  noticeBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 16,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.text,
    fontSize: 13,
    marginBottom: 18,
  },
  themeHeader: {
    display: "grid",
    gap: 10,
    marginBottom: 18,
  },
  themePreview: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  themePreviewLabel: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 600,
  },
  themeHint: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 12,
    lineHeight: 1.55,
  },
  themeOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  themeOption: {
    display: "grid",
    gap: 6,
    width: "100%",
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: 18,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.text,
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 116,
    alignContent: "start",
  },
  themeOptionActive: {
    borderColor: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    boxShadow: `0 0 0 1px ${uiTheme.colors.primary} inset, 0 10px 24px rgba(37, 99, 235, 0.12)`,
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  sideCard: {
    ...surfaceCard,
    padding: 22,
    borderRadius: 24,
    background: "var(--surface-card)",
  },
  sideHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sideTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  sideSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  searchBadge: {
    ...badgeBase,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.muted,
    border: `1px solid ${uiTheme.colors.border}`,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 46,
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 600,
    padding: "0 14px",
  },
  summaryList: {
    display: "grid",
    gap: 12,
  },
  quickActions: {
    display: "grid",
    gap: 8,
  },
  quickActionButton: {
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.text,
    minHeight: 56,
    padding: "0 16px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.03)",
  },
  quickActionDanger: {
    color: uiTheme.colors.danger,
  },
  quickActionLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 600,
    fontSize: 14,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  quickActionIconDanger: {
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  emptyState: {
    padding: "12px 2px 2px",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  switchRow: {
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    gap: 14,
    alignItems: "center",
    padding: "16px 0",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    cursor: "pointer",
  },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  switchText: {
    display: "grid",
    gap: 4,
    color: uiTheme.colors.text,
  },
  switchInput: {
    width: 20,
    height: 20,
    accentColor: uiTheme.colors.primary,
  },
};
