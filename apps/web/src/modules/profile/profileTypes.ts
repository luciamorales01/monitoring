export type ProfileTab = "personal" | "security" | "notifications" | "appearance";

export type ProfileData = {
  name: string;
  role: string;
  roleDescription: string;
  email: string;
  phone: string;
  timezone: string;
  memberSince: string;
  lastAccess: string;
  location: string;
};

export type ProfileFormState = Pick<
  ProfileData,
  "name" | "email" | "phone" | "timezone"
>;

export type NotificationFormState = {
  incidentEmails: boolean;
  reportEmails: boolean;
  criticalOnly: boolean;
};

