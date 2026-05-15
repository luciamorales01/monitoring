import type { Monitor } from "../../shared/monitorApi";

export const monitorFilterDefaults = {
  sort: "status",
  search: "",
  status: "ALL",
  type: "ALL",
};

export const monitorAllowedValues = {
  sort: ["status", "name", "latest-check", "created-at"],
  status: ["ALL", "UP", "DOWN", "PAUSED", "UNKNOWN"],
  type: ["ALL", "HTTP", "HTTPS"],
} as const;

export const MONITORS_PAGE_SIZE = 10;
export const EMPTY_MONITORS: Monitor[] = [];
