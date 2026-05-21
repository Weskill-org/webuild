import { supabase } from "@/integrations/supabase/client";

export type NotificationPayload = {
  new_application: { project_id: string };
  application_accepted: { project_id: string; user_id: string };
  application_rejected: { project_id: string; user_id: string };
  project_completed: { project_id: string; user_id: string };
  payment_received: { project_id: string; user_id: string; data?: { amount?: number | string; currency?: string } };
  milestone_completed: { project_id: string; user_id: string };
  new_project: { project_id: string };
  partnership_requested: { user_id: string };
  partnership_accepted: { user_id: string };
  partnership_rejected: { user_id: string };
  certificate_issued: { project_id: string; user_id: string };
  message: { user_id: string; data: { recipient_id: string; body: string; chatId: string } };
};

export async function sendNotification<T extends keyof NotificationPayload>(
  event: T,
  params: NotificationPayload[T]
) {
  try {
    await supabase.functions.invoke("send-notification", {
      body: { event, ...params },
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}
