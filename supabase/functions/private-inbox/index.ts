import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedMethods = "POST, OPTIONS";
const allowedHeaders = "authorization, x-client-info, apikey, content-type";
const maxAttempts = 5;

function jsonResponse(
  status: number,
  payload: Record<string, unknown>,
  origin?: string
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function matchesSecret(input: string, expected: string): boolean {
  const left = new TextEncoder().encode(input);
  const right = new TextEncoder().encode(expected);
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}`)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = (Deno.env.get("PORTAL_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    return jsonResponse(403, { message: "This portal origin is not allowed." });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": allowedMethods,
        "Access-Control-Allow-Headers": allowedHeaders,
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { message: "Method not allowed." }, origin);
  }

  const pinSecret = Deno.env.get("PORTAL_PIN");
  const rateLimitSalt = Deno.env.get("PORTAL_RATE_LIMIT_SALT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (
    !pinSecret ||
    pinSecret.length < 12 ||
    !rateLimitSalt ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return jsonResponse(500, { message: "The private inbox is not configured." }, origin);
  }

  const forwardedIp = request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!forwardedIp) {
    return jsonResponse(400, { message: "Could not verify this request." }, origin);
  }

  let payload: { pin?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { message: "Invalid request." }, origin);
  }

  if (typeof payload.pin !== "string" || payload.pin.length > 256) {
    return jsonResponse(400, { message: "Enter a valid passphrase." }, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const ipHash = await hashIp(forwardedIp, rateLimitSalt);
  const { data: isBlocked, error: limitError } = await supabase.rpc(
    "portal_pin_is_blocked",
    { p_ip_hash: ipHash }
  );

  if (limitError) {
    console.error("Could not check portal PIN rate limit:", limitError.message);
    return jsonResponse(500, { message: "The private inbox is temporarily unavailable." }, origin);
  }
  if (isBlocked) {
    return jsonResponse(429, { message: "Too many attempts. Please wait 15 minutes." }, origin);
  }

  if (!matchesSecret(payload.pin, pinSecret)) {
    const { error } = await supabase.rpc("portal_pin_record_failure", {
      p_ip_hash: ipHash,
      p_max_attempts: maxAttempts
    });
    if (error) {
      console.error("Could not record portal PIN failure:", error.message);
      return jsonResponse(500, { message: "The private inbox is temporarily unavailable." }, origin);
    }
    return jsonResponse(401, { message: "Incorrect passphrase." }, origin);
  }

  const { error: resetError } = await supabase.rpc("portal_pin_reset_attempts", {
    p_ip_hash: ipHash
  });
  if (resetError) {
    console.error("Could not reset portal PIN attempts:", resetError.message);
    return jsonResponse(500, { message: "The private inbox is temporarily unavailable." }, origin);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("inbox_messages")
    .select("id, sender_name, sender_email, message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (messagesError) {
    console.error("Could not read private inbox messages:", messagesError.message);
    return jsonResponse(500, { message: "Could not load messages." }, origin);
  }

  return jsonResponse(200, { messages }, origin);
});
