import "server-only";
import { admin } from "@/lib/supabase/admin";
import { referralCode } from "@/lib/referrals";
import { SITE } from "@/lib/site";
import { previewMode } from "@/lib/supabase/preview";
import { shareFacts, shareText, shareUrl, type ShareProgram, type ShareProps } from "@/lib/share-school";
export type { ShareProps };

// the programme columns a share needs (programmes are the shared library: nothing in them is anyone's own)
export const SHARE_COLUMNS = "id, name, degree, url, duration_months, tuition_usd, app_fee_usd, test_policy, ielts_min, toefl_min, fee_waiver, deadlines, verified_at, schools(name, city, state, country)";

type Raw = Omit<ShareProgram, "school"> & { schools: ShareProgram["school"] | null };
export const toShare = (r: Raw): ShareProgram => ({ ...r, school: r.schools ?? { name: "the school" } });

export async function loadShareProgram(id: string): Promise<ShareProgram | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) && !previewMode()) return null;
  const { data } = await admin().from("programs").select(SHARE_COLUMNS).eq("id", id).maybeSingle();
  return data ? toShare(data as unknown as Raw) : null;
}


// everything the share dialog needs for one programme, with this applicant's invite code in the link
export function shareProps(p: ShareProgram, ref: string | null, today = new Date().toISOString().slice(0, 10)): ShareProps {
  const f = shareFacts(p, today);
  const url = shareUrl(SITE.url, p.id, ref);
  return { programId: p.id, school: f.title, program: f.program, text: shareText(f, url, { invite: !!ref }), url, cardUrl: `/s/${p.id}/card` };
}

export async function inviteCode(userId: string): Promise<string | null> {
  return referralCode(userId).catch(() => null);
}
