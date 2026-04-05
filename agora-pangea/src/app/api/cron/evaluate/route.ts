import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

// Endpoint called by Vercel Cron to evaluate Community Review.
// Calls the RPC evaluate_curation_markets() which:
// 1. Queries all proposals with status = 'curation'
// 2. Calculates aggregate signal sum (SUM(signal_strength))
// 3. Promotes to 'active' those exceeding the threshold (100 signals MVP)
// 4. Automatically sets expires_at

export async function GET(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`cron:${clientIp}`, RATE_LIMITS.cron);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Verify the call comes from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use service role key to bypass RLS and invoke SECURITY DEFINER
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 0a. Update election statuses (upcoming → candidature → voting → closed)
    await supabase.rpc("update_election_statuses");

    // 0b. Close expired proposals
    const { data: closedCount } = await supabase.rpc("close_expired_proposals");

    // 1. Evaluate curation markets (promote proposals to active)
    const { data, error } = await supabase.rpc("evaluate_curation_markets");

    if (error) {
      console.error("Error evaluate_curation_markets:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 2. Convert approved closed proposals to laws
    const { data: convertedCount, error: convertError } = await supabase.rpc("convert_closed_proposals_to_laws");

    if (convertError) {
      console.error("Error convert_closed_proposals_to_laws:", convertError);
    }

    return NextResponse.json({
      success: true,
      expired_closed: closedCount ?? 0,
      promoted: data,
      laws_created: convertedCount ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Unexpected cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
