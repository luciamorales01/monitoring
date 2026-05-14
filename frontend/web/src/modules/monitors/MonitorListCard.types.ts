import type { Monitor } from '../../shared/monitorApi';
import type { MonitorSection } from '../../shared/sectionsStore';

export type FeedbackState = {
  text: string;
  type: "success" | "error";
} | null;

export type MonitorListCardProps = {
  monitors: Monitor[];
  loading?: boolean;
  error?: string | null;
  emptyFilteredMessage?: string;
  emptyStateMessage?: string;
  loadingLabel?: string;
  onRefresh?: () => Promise<unknown> | unknown;
  onUseSectionSchedule?: (monitor: Monitor) => Promise<void>;
  sectionSchedule?: Pick<
    MonitorSection,
    "expectedStatusCode" | "frequencySeconds" | "timeoutSeconds" | "isActive"
  > | null;
};

