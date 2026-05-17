import type { Monitor } from "../../shared/monitorApi";
import type { MonitorSection, SectionIcon } from "../../shared/sectionsStore";
import type { User } from "../../shared/userApi";

export type SectionEditorSubmitPayload = {
  name: string;
  description: string;
  icon: SectionIcon;
  monitorIds: number[];
  memberIds: number[];
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
};

export type SectionEditorMode = 'full' | 'monitors' | 'members';

export type SectionEditorModalProps = {
  isOpen: boolean;
  monitors: Monitor[];
  canManageMembers: boolean;
  users: User[];
  section: MonitorSection | null;
  onClose: () => void;
  onSubmit: (payload: SectionEditorSubmitPayload) => void;
  mode?: SectionEditorMode;
};
