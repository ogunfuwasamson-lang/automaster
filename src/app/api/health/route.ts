import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    configured: {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      cron: !!process.env.CRON_SECRET,
    },
  });
}
