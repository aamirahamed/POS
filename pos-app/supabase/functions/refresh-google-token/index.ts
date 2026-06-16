import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve the user's Google tokens
    const { data: tokenRecord, error: dbError } = await supabase
      .from("user_google_tokens")
      .select("refresh_token, access_token, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error("Database error retrieving token:", dbError);
      return new Response(JSON.stringify({ error: "Database error retrieving token", details: dbError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: "No Google token connection found. Please sign in with Google." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the current token is still valid (more than 5 minutes remaining)
    const expiresAt = new Date(tokenRecord.expires_at).getTime();
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    if (expiresAt > fiveMinutesFromNow && tokenRecord.access_token) {
      return new Response(
        JSON.stringify({
          access_token: tokenRecord.access_token,
          expires_at: tokenRecord.expires_at,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Current token is expired or expiring soon, refresh it
    if (!tokenRecord.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh token available. Please reconnect your calendar." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Backend environment error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured on backend." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Google's OAuth token endpoint
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRecord.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Google token refresh failed response status:", response.status, "body:", errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to refresh token from Google.", details: errorBody }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const googleData = await response.json();
    const newAccessToken = googleData.access_token;
    const expiresIn = googleData.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const nextRefreshToken = googleData.refresh_token || tokenRecord.refresh_token;

    // Save back to user_google_tokens
    const { error: updateError } = await supabase
      .from("user_google_tokens")
      .upsert({
        user_id: user.id,
        access_token: newAccessToken,
        refresh_token: nextRefreshToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error("Failed to save refreshed token to DB:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save refreshed token to database.", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("Unhandled error in edge function:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
