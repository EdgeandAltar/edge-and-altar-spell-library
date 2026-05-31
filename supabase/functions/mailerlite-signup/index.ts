import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
const MAILERLITE_GROUP_ID = Deno.env.get("MAILERLITE_GROUP_ID");

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    // Supabase auth hook sends user data in this format
    const email = payload?.record?.email || payload?.email;
    
    if (!email) {
      console.log("No email found in payload:", JSON.stringify(payload));
      return new Response("No email", { status: 200 });
    }

    console.log("New signup, adding to Mailerlite:", email);

    // Add subscriber to Mailerlite
    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MAILERLITE_API_KEY}`
      },
      body: JSON.stringify({
        email: email,
        groups: [MAILERLITE_GROUP_ID]
      })
    });

    const result = await response.json();
    console.log("Mailerlite response:", JSON.stringify(result));

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("mailerlite-signup error:", err);
    return new Response("Server error", { status: 500 });
  }
});