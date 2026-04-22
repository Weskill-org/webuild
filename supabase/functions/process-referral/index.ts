import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { referral_code } = await req.json();

    if (!referral_code || typeof referral_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid referral_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referredUserId = user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check settings
    const { data: settingsData } = await adminClient
      .from("platform_settings").select("value").eq("key", "referral_reward").single();

    const settings = settingsData?.value as {
      amount: number; currency: string; enabled: boolean; max_referrals_per_user: number;
    } | null;

    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ error: "Referral system is currently disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewardAmount = settings.amount || 150;
    const maxReferrals = settings.max_referrals_per_user || 50;

    // Find referrer
    const { data: referrerProfile } = await adminClient
      .from("profiles").select("id, full_name, role")
      .eq("referral_code", referral_code.trim().toUpperCase()).single();

    if (!referrerProfile) {
      return new Response(
        JSON.stringify({ error: "Invalid referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referrerId = referrerProfile.id;

    // Anti-fraud checks
    if (referrerId === referredUserId) {
      return new Response(
        JSON.stringify({ error: "You cannot use your own referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingReferral } = await adminClient
      .from("referrals").select("id").eq("referred_id", referredUserId).maybeSingle();

    if (existingReferral) {
      return new Response(
        JSON.stringify({ error: "This account has already used a referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { count: referralCount } = await adminClient
      .from("referrals").select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerId).eq("status", "completed");

    if ((referralCount ?? 0) >= maxReferrals) {
      return new Response(
        JSON.stringify({ error: "Referrer has reached maximum referral limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create wallets
    const getOrCreateWallet = async (ownerId: string) => {
      const { data: wallet } = await adminClient
        .from("wallets").select("id, balance").eq("owner_id", ownerId).maybeSingle();
      if (wallet) return wallet;
      const { data: newWallet } = await adminClient
        .from("wallets").insert({ owner_id: ownerId, balance: 0, currency: "INR" })
        .select("id, balance").single();
      return newWallet!;
    };

    const referrerWallet = await getOrCreateWallet(referrerId);
    const referredWallet = await getOrCreateWallet(referredUserId);

    // Create referral record
    const { error: referralInsertError } = await adminClient.from("referrals").insert({
      referrer_id: referrerId, referred_id: referredUserId,
      referral_code: referral_code.trim().toUpperCase(),
      status: "completed", referrer_reward: rewardAmount, referred_reward: rewardAmount,
      referrer_credited: true, referred_credited: true,
      completed_at: new Date().toISOString(),
    });

    if (referralInsertError) {
      return new Response(
        JSON.stringify({ error: "Failed to process referral. You may have already used a referral code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit wallets
    await adminClient.from("transactions").insert({
      wallet_id: referrerWallet.id, type: "credit", amount: rewardAmount,
      description: "Referral reward — friend signed up using your code",
    });
    await adminClient.from("wallets").update({
      balance: (referrerWallet.balance ?? 0) + rewardAmount, updated_at: new Date().toISOString(),
    }).eq("id", referrerWallet.id);

    await adminClient.from("transactions").insert({
      wallet_id: referredWallet.id, type: "credit", amount: rewardAmount,
      description: `Welcome bonus — signed up with referral code ${referral_code}`,
    });
    await adminClient.from("wallets").update({
      balance: (referredWallet.balance ?? 0) + rewardAmount, updated_at: new Date().toISOString(),
    }).eq("id", referredWallet.id);

    // Notifications
    await adminClient.from("notifications").insert({
      user_id: referrerId, type: "referral", title: "Referral Successful! 🎉",
      body: `Someone signed up using your referral code! ${rewardAmount} coins have been credited to your wallet.`,
    });
    await adminClient.from("notifications").insert({
      user_id: referredUserId, type: "referral", title: "Welcome Bonus! 🎁",
      body: `${rewardAmount} coins have been credited to your wallet as a welcome bonus!`,
    });

    return new Response(
      JSON.stringify({ success: true, message: `${rewardAmount} coins credited to both accounts!`, reward_amount: rewardAmount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-referral error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
