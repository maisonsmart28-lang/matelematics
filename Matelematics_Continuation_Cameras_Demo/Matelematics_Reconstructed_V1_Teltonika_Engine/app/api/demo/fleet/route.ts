import { NextResponse } from "next/server";
import { buildDemoSnapshot } from "../../../../lib/demo-fleet";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildDemoSnapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
