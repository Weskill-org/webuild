import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, project_id, user_id, data } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Insert in-app notifications
    const notificationRows = notification.recipients.map((uid) => ({
      user_id: uid,
      type: event,
      title: notification!.title,
      body: notification!.body,
    }));

    await supabaseAdmin.from("notifications").insert(notificationRows);

    // Send email if Resend is configured
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
      JSON.stringify({ success: true, sent_to: notification.recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
