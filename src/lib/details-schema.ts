import * as z from "zod/v4";
import { PORTAL_DETAIL_FIELDS } from "@/lib/portal-fields";

// every field the form shows is accepted: built from the form's own field list, so a new field can never be
// silently dropped on save again (country of birth was, for a while)
const str = (max = 200) => z.string().trim().max(max).nullable().optional();
const LIMIT: Record<string, number> = { preferred_name: 80, phone: 40, gender: 60, city: 100, state: 100, postal_code: 20, country: 100, country_of_birth: 100, linkedin: 300, website: 300 };
export const DetailsSchema = z.object(
  Object.fromEntries(
    PORTAL_DETAIL_FIELDS.map((f) => [f.key, f.key === "date_of_birth" ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")) : str(LIMIT[f.key] ?? 200)]),
  ) as Record<string, z.ZodType>,
);
