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
    const { action, project_id, amount, currency, user_id, order_id, payment_id, signature } = await req.json();

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;

    // ACTION: create_order — creates a Razorpay order for escrow
    if (action === "create_order") {
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // paise
          currency: currency || "INR",
          receipt: `proj_${project_id}`,
          notes: { project_id, user_id },
        }),
      });

      const order = await orderRes.json();
      if (order.error) {
        return new Response(JSON.stringify({ error: order.error.description }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Store escrow record
      await supabaseAdmin.from("escrow").insert({
        project_id,
        payer_id: user_id,
        razorpay_order_id: order.id,
        amount,
        currency: currency || "INR",
        status: "pending",
      });

      return new Response(
        JSON.stringify({ order_id: order.id, key_id: RAZORPAY_KEY_ID }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: verify_payment — verify signature and update escrow
    if (action === "verify_payment") {
      const crypto = await import("node:crypto");
      const body = order_id + "|" + payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return new Response(
          JSON.stringify({ error: "Invalid payment signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update escrow
      await supabaseAdmin
        .from("escrow")
        .update({ status: "held", razorpay_payment_id: payment_id })
        .eq("razorpay_order_id", order_id);

      return new Response(
        JSON.stringify({ success: true, message: "Payment verified and held in escrow" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: release_payment — release escrow to student on milestone completion
    if (action === "release_payment") {
      const COMMISSION_RATE = 0.10; // 10% platform commission

      const { data: escrow } = await supabaseAdmin
        .from("escrow")
        .select("*")
        .eq("project_id", project_id)
        .eq("status", "held")
        .single();

      if (!escrow) {
        return new Response(
          JSON.stringify({ error: "No held escrow found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const commission = escrow.amount * COMMISSION_RATE;
      const payout = escrow.amount - commission;

      // Get project to find accepted applicant
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("owner_id")
        .eq("id", project_id)
        .single();

      const { data: acceptedApp } = await supabaseAdmin
        .from("project_applications")
        .select("applicant_id")
        .eq("project_id", project_id)
        .eq("status", "accepted")
        .single();

      if (!acceptedApp) {
        return new Response(
          JSON.stringify({ error: "No accepted applicant found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Credit student wallet
      const { data: studentWallet } = await supabaseAdmin
        .from("wallets")
        .select("id, balance")
        .eq("owner_id", acceptedApp.applicant_id)
        .single();

      if (studentWallet) {
        await supabaseAdmin
          .from("wallets")
          .update({ balance: (studentWallet.balance ?? 0) + payout })
          .eq("id", studentWallet.id);

        await supabaseAdmin.from("transactions").insert({
          wallet_id: studentWallet.id,
          type: "credit",
          amount: payout,
          description: `Payment for project (after ${COMMISSION_RATE * 100}% commission)`,
          reference_id: project_id,
        });
      }

      // Update escrow status
      await supabaseAdmin
        .from("escrow")
        .update({ status: "released", commission })
        .eq("id", escrow.id);

      return new Response(
        JSON.stringify({ success: true, payout, commission }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
