import { connection } from "next/server";

/** Liveness check. Reports that the app is serving requests and nothing else. */
export async function GET() {
  // Opt out of prerendering so the timestamp is per request.
  await connection();
  return Response.json(
    {
      status: "ok",
      service: "techbash",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
