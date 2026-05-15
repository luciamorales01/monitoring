import type { Monitor } from '../../shared/monitorApi';
import type { MonitorSection } from '../../shared/sectionsStore';

export type SectionSummary = MonitorSection & {
  monitors: Monitor[];
  monitorCount: number;
  onlineCount: number;
  downCount: number;
  pausedCount: number;
  unknownCount: number;
  statusLabel: string;
  statusTone: 'green' | 'orange' | 'slate';
};

export type EditorState = {
  isOpen: boolean;
  section: MonitorSection | null;
};

export type FeedbackState =
  | {
      type: 'success' | 'error';
      text: string;
    }
  | null;

