export type StaffRole = "admin" | "state_organizer" | "county_organizer" | "volunteer_staff";

export interface StaffRecord {
  id: string;
  display_name: string;
  role: StaffRole;
  status: "active" | "disabled";
}

export interface StaffContext {
  staffUserId: string;
  authUserId: string;
  displayName: string;
  role: StaffRole;
  aal: "aal1" | "aal2" | null;
}
