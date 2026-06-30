import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Firebase OAuth2 helpers ────────────────────────────────────────────────

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${encHeader}.${encPayload}`;

  // Import the RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyBuf = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64url(sig)}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Google access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            default_vibrate_timings: true,
            default_light_settings: true,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(
      `[FCM] Failed to send to token ${deviceToken.slice(0, 20)}...: ${errText}`
    );
    return false;
  }
  return true;
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, project_id, user_id, data } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FIREBASE_SA_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    // Authentication Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    let authUser = null;

    if (!isServiceRole) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authUser = user;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authorization Check for specific events
    if (event === "message" && !isServiceRole && authUser?.id !== user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only send messages as yourself" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification based on event type
    let notification: { title: string; body: string; recipients: string[] } | null = null;

    switch (event) {
      case "new_application": {
        // Notify project owner about new application
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("owner_id, title")
          .eq("id", project_id)
          .single();
        if (project) {
          notification = {
            title: "New Application Received",
            body: `Someone applied to your project "${project.title}"`,
            recipients: [project.owner_id],
          };
        }
        break;
      }

      case "application_accepted": {
        notification = {
          title: "Application Accepted! 🎉",
          body: `Your application for the project has been accepted. Start working!`,
          recipients: [user_id],
        };
        break;
      }

      case "application_rejected": {
        notification = {
          title: "Application Update",
          body: `Your application status has been updated.`,
          recipients: [user_id],
        };
        break;
      }

      case "project_completed": {
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("title")
          .eq("id", project_id)
          .single();
        const { data: apps } = await supabaseAdmin
          .from("project_applications")
          .select("applicant_id")
          .eq("project_id", project_id)
          .eq("status", "accepted");
        const recipients = (apps ?? []).map((a: any) => a.applicant_id);
        if (user_id) recipients.push(user_id);
        notification = {
          title: "Project Completed",
          body: `Project "${project?.title}" has been marked as completed.`,
          recipients: [...new Set(recipients)],
        };
        break;
      }

      case "payment_received": {
        notification = {
          title: "Payment Received 💰",
          body: `You received a payment of ${data?.amount ?? ""} ${data?.currency ?? ""}`,
          recipients: [user_id],
        };
        break;
      }

      case "milestone_completed": {
        notification = {
          title: "Milestone Completed ✅",
          body: `A milestone has been completed on your project.`,
          recipients: [user_id],
        };
        break;
      }

      case "new_project": {
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("title")
          .eq("id", project_id)
          .single();
        
        const { data: users } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .or("role.eq.student,role.eq.campus");
        
        const recipients = (users ?? []).map((u: any) => u.id);
        notification = {
          title: "New Project Posted! 🚀",
          body: `A new project "${project?.title || 'Untitled Project'}" has been posted. Check it out!`,
          recipients: recipients,
        };
        break;
      }

      case "partnership_requested": {
        // notify campus
        notification = {
          title: "Partnership Request Received",
          body: `A company wants to partner with your campus!`,
          recipients: [user_id],
        };
        break;
      }

      case "partnership_accepted": {
        // notify company
        notification = {
          title: "Partnership Accepted! 🤝",
          body: `Your partnership request has been accepted by the campus.`,
          recipients: [user_id],
        };
        break;
      }

      case "partnership_rejected": {
        // notify company
        notification = {
          title: "Partnership Update",
          body: `Your partnership request was declined.`,
          recipients: [user_id],
        };
        break;
      }

      case "message": {
        const { data: sender } = await supabaseAdmin
          .from("profiles")
          .select("full_name, company_name")
          .eq("id", user_id)
          .single();
        
        notification = {
          title: sender?.full_name || sender?.company_name || "New Message",
          body: data?.body || "You have a new message",
          recipients: [data?.recipient_id],
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown event type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!notification) {
      return new Response(
        JSON.stringify({ error: "Could not build notification" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 1. Insert in-app notifications ─────────────────────────────────────
    const notificationRows = notification.recipients.map((uid) => ({
      user_id: uid,
      type: event,
      title: notification!.title,
      body: notification!.body,
    }));

    await supabaseAdmin.from("notifications").insert(notificationRows);

    // ─── 2. Send FCM push notifications ─────────────────────────────────────
    let fcmSentCount = 0;
    let fcmFailCount = 0;
    const staleTokens: string[] = [];

    if (FIREBASE_SA_JSON) {
      try {
        const serviceAccount = JSON.parse(FIREBASE_SA_JSON);
        const firebaseProjectId = serviceAccount.project_id;
        const accessToken = await getAccessToken(serviceAccount);

        // Fetch all FCM tokens for the recipient user IDs
        const { data: tokenRows, error: tokenErr } = await supabaseAdmin
          .from("fcm_tokens")
          .select("token, user_id")
          .in("user_id", notification.recipients);

        if (tokenErr) {
          console.error("[FCM] Error fetching tokens:", tokenErr);
        }

        const tokens = tokenRows ?? [];
        console.log(
          `[FCM] Sending push to ${tokens.length} device(s) for ${notification.recipients.length} recipient(s)`
        );

        // Build the data payload for deep linking
        const fcmData: Record<string, string> = {
          type: event,
          ...(project_id ? { projectId: project_id } : {}),
          ...(data?.chatId ? { chatId: data.chatId } : {}),
        };

        // Send to each device in parallel
        const results = await Promise.allSettled(
          tokens.map(async (row: { token: string; user_id: string }) => {
            const ok = await sendFcmMessage(
              accessToken,
              firebaseProjectId,
              row.token,
              notification!.title,
              notification!.body,
              fcmData
            );
            if (ok) {
              fcmSentCount++;
            } else {
              fcmFailCount++;
              staleTokens.push(row.token);
            }
          })
        );

        // Clean up stale / invalid tokens
        if (staleTokens.length > 0) {
          console.log(`[FCM] Cleaning up ${staleTokens.length} stale token(s)`);
          await supabaseAdmin
            .from("fcm_tokens")
            .delete()
            .in("token", staleTokens);
        }
      } catch (fcmErr) {
        console.error("[FCM] Push notification error:", fcmErr);
      }
    } else {
      console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping push");
    }

    // ─── 3. Send email if Resend is configured ──────────────────────────────
    if (RESEND_API_KEY) {
      for (const uid of notification.recipients) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
        const email = userData?.user?.email;
        if (!email) continue;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Webuild <notifications@webuild.lovable.app>",
            to: [email],
            subject: notification.title,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#2563eb;">${notification.title}</h2>
              <p style="color:#374151;font-size:16px;">${notification.body}</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <p style="color:#9ca3af;font-size:12px;">Webuild Platform</p>
            </div>`,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: notification.recipients.length,
        fcm_sent: fcmSentCount,
        fcm_failed: fcmFailCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
