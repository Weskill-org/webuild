import { supabase } from "@/integrations/supabase/client";

type NotificationEvent =
  | "new_application"
  | "application_accepted"
  | "application_rejected"
  | "project_completed"
  | "payment_received"
  | "milestone_completed";

export async function sendNotification(
  event: NotificationEvent,
  params: { project_id?: string; user_id?: string; data?: Record<string, any> }
) {
  try {
    await supabase.functions.invoke("send-notification", {
      body: { event, ...params },
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}
