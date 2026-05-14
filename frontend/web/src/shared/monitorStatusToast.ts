import type { MonitorStatus } from "./monitorApi";

export type MonitorStatusToast =
  | {
      text: string;
      type: "ok" | "error";
    }
  | null;

export const getMonitorStatusToast = (
  status?: MonitorStatus,
): MonitorStatusToast => {
  if (status === "UP") {
    return { text: "Monitor operativo", type: "ok" };
  }

  if (status === "DOWN") {
    return { text: "Monitor caído", type: "error" };
  }

  return null;
};
