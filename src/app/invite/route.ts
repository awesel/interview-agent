import { NextRequest, NextResponse } from "next/server";

// Stub: accepts { email, interviewerId } and would email a magic link
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email: string | undefined = body?.email;
  const interviewerId: string | undefined = body?.interviewerId;
  if (!email || !interviewerId) {
    return NextResponse.json({ error: "email and interviewerId required" }, { status: 400 });
  }
  // In real impl: issue a signed token, send via SMTP provider
  return NextResponse.json({ ok: true });
}


