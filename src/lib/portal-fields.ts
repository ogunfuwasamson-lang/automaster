// the extra details portals ask for. no imports, so client forms stay small.
export interface PortalDetails {
  preferred_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  linkedin?: string | null;
  website?: string | null;
}

export const PORTAL_DETAIL_FIELDS: { key: keyof PortalDetails; label: string; type?: string; required?: boolean }[] = [
  { key: "email", label: "email for applications", type: "email", required: true },
  { key: "phone", label: "phone (with country code)", type: "tel", required: true },
  { key: "date_of_birth", label: "date of birth", type: "date", required: true },
  { key: "gender", label: "gender (as you want it on forms)" },
  { key: "preferred_name", label: "preferred first name" },
  { key: "address_line1", label: "address line 1", required: true },
  { key: "address_line2", label: "address line 2" },
  { key: "city", label: "city", required: true },
  { key: "state", label: "state / province" },
  { key: "postal_code", label: "postal code" },
  { key: "country", label: "country", required: true },
  { key: "linkedin", label: "linkedin url" },
  { key: "website", label: "website" },
];

export interface RecommenderRow {
  name: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  relationship: string | null;
  phone: string | null;
}

