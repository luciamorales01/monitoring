import type { CSSProperties } from "react";
import {
  pageMain,
  pageTitle,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from "../../../theme/commonStyles";

export const monitorDetailStyles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    paddingBottom: 48,
  },

  breadcrumb: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
    marginBottom: 18,
  },

  breadcrumbLink: {
    color: uiTheme.colors.primary,
    textDecoration: "none",
    fontWeight: 600,
  },

  alertBanner: {
    border: "1px solid rgba(220, 38, 38, 0.18)",
    background: uiTheme.colors.dangerSoft,
    borderRadius: uiTheme.radii.md,
    padding: "16px 18px",
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    boxShadow: "0 12px 30px rgba(220, 38, 38, 0.08)",
  },

  alertMeta: {
    color: uiTheme.colors.danger,
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  heroCard: {
    ...surfaceCard,
    borderRadius: 22,
    padding: 24,
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "center",
    marginBottom: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    position: "relative",
    overflow: "visible",
    zIndex: 3,
  },

  heroLeft: {
    display: "flex",
    gap: 20,
    alignItems: "center",
    minWidth: 0,
  },

  heroText: {
    minWidth: 0,
  },

  monitorIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  title: {
    ...pageTitle,
    margin: 0,
    fontSize: 27,
    letterSpacing: "0em",
  },

  url: {
    display: "block",
    marginTop: 8,
    color: uiTheme.colors.primary,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 620,
  },

  metaRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  heroRight: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    flexShrink: 0,
  },

  lastCheckBox: {
    display: "grid",
    gap: 3,
    minWidth: 150,
    padding: "12px 14px",
    borderRadius: 16,
    background: uiTheme.colors.surfaceSoft,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  heroActions: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    zIndex: 4,
  },

  actionButton: {
    ...secondaryButtonBase,
    width: 42,
    height: 42,
    padding: 0,
    borderRadius: 13,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
  },

  actionMenu: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    zIndex: 50,
    minWidth: 232,
    display: "grid",
    gap: 6,
    padding: 8,
    borderRadius: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
    boxShadow: "0 22px 48px rgba(15, 23, 42, 0.16)",
  },

  actionMenuItem: {
    ...secondaryButtonBase,
    width: "100%",
    justifyContent: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minHeight: 42,
    padding: "0 14px",
    cursor: "pointer",
    borderRadius: 14,
    background: "transparent",
    borderColor: "transparent",
    fontWeight: 700,
  },

  primaryButton: {
    ...primaryButtonBase,
    borderRadius: 13,
    padding: "0 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.22)",
  },

  secondaryButton: {
    ...secondaryButtonBase,
    borderRadius: 13,
    padding: "0 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  exportCard: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  exportTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0em",
  },

  exportSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
    maxWidth: 620,
  },

  exportControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 14,
  },

  kpiCard: {
    ...surfaceCard,
    borderRadius: 18,
    padding: 18,
    minHeight: 110,
    display: "grid",
    alignContent: "center",
    gap: 7,
    border: "1px solid transparent",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  kpiTitle: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontWeight: 700,
    fontSize: 12,
  },

  kpiValue: {
    display: "block",
    fontSize: 26,
    lineHeight: 1.1,
    letterSpacing: "0em",
  },

  kpiDescription: {
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  chartToolbarCard: {
    ...surfaceCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  toolbarTitle: {
    fontSize: 14,
  },

  toolbarControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  segmentedControl: {
    display: "inline-flex",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  segmentedButton: {
    border: "none",
    background: "transparent",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 700,
    color: uiTheme.colors.muted,
    cursor: "pointer",
  },

  segmentedButtonActive: {
    background: uiTheme.colors.surface,
    color: uiTheme.colors.primary,
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
  },

  select: {
    minHeight: 36,
    borderRadius: 999,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
    background: "var(--control-bg)",
    color: uiTheme.colors.text,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 700,
    outline: "none",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 320px",
    gap: 14,
    marginBottom: 14,
  },

  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
    marginTop: 14,
    alignItems: "start",
  },

  cardLarge: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  card: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  infoCard: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },

  cardHeaderCompact: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0em",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  helperText: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    paddingTop: 14,
  },

  metric: {
    display: "grid",
    gap: 5,
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: 10,
    padding: "12px 0",
    fontSize: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  emptyState: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
  },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },

  pausedBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#92400e",
    background: "#fef3c7",
  },

  chartEmpty: {
    height: 230,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.slate,
    border: `1px dashed ${uiTheme.colors.borderStrong}`,
    borderRadius: 16,
    background: uiTheme.colors.surfaceSoft,
  },

  statusChartWrap: {
    height: 230,
    padding: 18,
    borderRadius: 16,
    background: uiTheme.colors.surface,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
    marginBottom: 12,
    display: "grid",
    gridTemplateRows: "1fr 18px",
    gap: 10,
  },

  statusTimelineTrack: {
    display: "flex",
    alignItems: "end",
    gap: 3,
    minHeight: 150,
  },

  statusTimelineSegment: {
    flex: 1,
    minWidth: 3,
    borderRadius: "999px 999px 8px 8px",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
    transition: "height 160ms ease, opacity 160ms ease",
  },

  statusEventRow: {
    display: "flex",
    gap: 3,
    alignItems: "center",
  },

  statusEventSlot: {
    flex: 1,
    minWidth: 3,
    display: "grid",
    placeItems: "center",
  },

  statusEventMarker: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "#dc2626",
    boxShadow: "0 0 0 4px rgba(220, 38, 38, 0.1)",
  },

  legendRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  legendItem: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    fontWeight: 700,
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.7fr",
    gap: 12,
    paddingBottom: 10,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.7fr",
    gap: 12,
    alignItems: "center",
    padding: "12px 0",
    fontSize: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  statusInline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
  },

  statusDot: {
    display: "inline-block",
    width: 9,
    height: 9,
    borderRadius: 999,
    flexShrink: 0,
  },

  timeline: {
    display: "grid",
    gap: 14,
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    gap: 12,
    alignItems: "start",
    paddingBottom: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  timelineMarkerWrap: {
    paddingTop: 4,
  },

  timelineTitle: {
    fontSize: 13,
  },

  timelineMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  timelineError: {
    margin: "7px 0 0",
    color: "#b91c1c",
    fontSize: 12,
    padding: "8px 10px",
    background: uiTheme.colors.dangerSoft,
    borderRadius: 10,
  },

  locationEmpty: {
    minHeight: 140,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },

  locationList: {
    display: "grid",
    gap: 12,
  },

  locationRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 18,
    alignItems: "center",
    padding: "14px 0",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  locationName: {
    fontSize: 14,
  },

  locationMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  locationProgressWrap: {
    display: "grid",
    gap: 7,
  },

  locationProgressTrack: {
    height: 8,
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    overflow: "hidden",
  },

  locationProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  locationStats: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  locationStat: {
    padding: "5px 9px",
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    fontWeight: 700,
  },

  toast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    padding: "12px 16px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    zIndex: 999,
  },
};
