import { NextResponse } from "next/server";
import { getDiscoveryInfo } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getDiscoveryInfo(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}