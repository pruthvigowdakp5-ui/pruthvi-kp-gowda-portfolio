import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

function response(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: jsonHeaders
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return response(405, "Method not allowed.");
  }

  let payload: { form_data?: Record<string, unknown> };
  try {
    payload = await request.json();
  } catch {
    return response(400, "Invalid JSON payload.");
  }

  const formData = payload.form_data;
  const name = formData?.name;
  const email = formData?.email;
  const message = formData?.message;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return response(400, "Name, email, and message are required.");
  }

  const senderName = name.trim();
  const senderEmail = email.trim();
  const senderMessage = message.trim();

  if (
    senderName.length < 2 ||
    senderName.length > 120 ||
    senderEmail.length < 3 ||
    senderEmail.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail) ||
    senderMessage.length < 10 ||
    senderMessage.length > 10000
  ) {
    return response(400, "The submitted message has invalid field lengths or email.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, "Message storage is not configured.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.from("inbox_messages").insert({
    sender_name: senderName,
    sender_email: senderEmail,
    message: senderMessage
  });

  if (error) {
    console.error("Could not store FormSubmit message:", error.message);
    return response(500, "Could not store the submitted message.");
  }

  return response(200, "Message received.");
});
