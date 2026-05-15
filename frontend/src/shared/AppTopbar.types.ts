import type { ReactNode } from 'react';

export type TopbarCta = {
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
};

export type TopbarUserSummary = {
  initials: string;
  name: string;
  role: string;
};

export type AppTopbarProps = {
  breadcrumb?: ReactNode;
  cta?: TopbarCta;
  eyebrow?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  showRefreshButton?: boolean;
  showSearch?: boolean;
  subtitle?: string;
  title: string;
  userSummary?: TopbarUserSummary;
};
