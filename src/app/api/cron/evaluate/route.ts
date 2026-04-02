import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint invocato da Vercel Cron per valutare il Mercato di Curatela.
// Chiama la funzione RPC evaluate_curation_markets() che:
// 1. Interroga tutte le proposte con status = 'curation'
// 2. Calcola la somma aggregata dei segnali (SUM(signal_strength))
// 3. Promuove a 'active' quelle che superano la soglia (100 segnali MVP)
// 4. Imposta automaticamente expires_at

export async function GET(request: Request) {
  // Verifica che la chiamata provenga da Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Usa la service role key per bypassare RLS e invocare SECURITY DEFINER
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 0. Close expired proposals
    const { data: closedCount } = await supabase.rpc("close_expired_proposals");

    // 1. Evaluate curation markets (promote proposals to active)
    const { data, error } = await supabase.rpc("evaluate_curation_markets");

    if (error) {
      console.error("Errore evaluate_curation_markets:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 2. Convert approved closed proposals to laws
    const { data: convertedCount, error: convertError } = await supabase.rpc("convert_closed_proposals_to_laws");

    if (convertError) {
      console.error("Errore convert_closed_proposals_to_laws:", convertError);
    }

    return NextResponse.json({
      success: true,
      expired_closed: closedCount ?? 0,
      promoted: data,
      laws_created: convertedCount ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Errore imprevisto nel cron:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
