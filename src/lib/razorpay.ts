import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CreateOrderParams {
  projectId: string;
  amount: number;
  currency?: string;
  userId: string;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const { data, error } = await supabase.functions.invoke("razorpay", {
    body: {
      action: "create_order",
      project_id: params.projectId,
      amount: params.amount,
      currency: params.currency || "INR",
      user_id: params.userId,
    },
  });

  if (error) throw new Error(error.message);
  return data as { order_id: string; key_id: string };
}

export function openRazorpayCheckout(
  orderId: string,
  keyId: string,
  amount: number,
  projectTitle: string,
  userEmail: string
): Promise<PaymentResult> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK not loaded. Add the script to index.html."));
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(amount * 100),
      currency: "INR",
      name: "Webuild",
      description: `Payment for ${projectTitle}`,
      order_id: orderId,
      prefill: { email: userEmail },
      handler: async (response: any) => {
        // Verify payment
        const { data, error } = await supabase.functions.invoke("razorpay", {
          body: {
            action: "verify_payment",
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          },
        });

        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, paymentId: response.razorpay_payment_id });
        }
      },
      modal: { ondismiss: () => resolve({ success: false, error: "Payment cancelled" }) },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}

export async function releaseEscrow(projectId: string) {
  const { data, error } = await supabase.functions.invoke("razorpay", {
    body: { action: "release_payment", project_id: projectId },
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; payout: number; commission: number };
}
