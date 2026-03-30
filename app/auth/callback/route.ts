import { NextResponse } from "next/server"
import { exchangeCodeForSession } from "@/lib/auth"

// Handles OAuth and magic-link callbacks from Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    try {
      await exchangeCodeForSession(code)
      return NextResponse.redirect(`${origin}${next}`)
    } catch {
      return NextResponse.redirect(`${origin}/auth/error`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
