import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StudentInput {
  email: string;
  full_name: string;
  phone?: string;
}

interface SingleRequest {
  mode: "single";
  email: string;
  full_name: string;
  phone?: string;
  campus_id: string;
  batch_id: string;
}

interface BulkRequest {
  mode: "bulk";
  students: StudentInput[];
  campus_id: string;
  batch_id: string;
}

type RequestBody = SingleRequest | BulkRequest;

interface StudentResult {
  email: string;
  status: "invited" | "linked" | "already_enrolled" | "error";
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: RequestBody = await req.json();
    const { campus_id, batch_id } = body;

    // IDOR Check
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && (profile?.role !== "campus" || user.id !== campus_id)) {
       return new Response(
          JSON.stringify({ error: "Forbidden: You do not have access to this campus" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
    }

    if (!campus_id || !batch_id) {
      return new Response(
        JSON.stringify({ error: "campus_id and batch_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that the batch belongs to the campus
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("id, campus_id")
      .eq("id", batch_id)
      .single();

    if (batchError || !batch) {
      return new Response(
        JSON.stringify({ error: "Batch not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (batch.campus_id !== campus_id) {
      return new Response(
        JSON.stringify({ error: "Batch does not belong to this campus" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine list of students to process
    let studentsToProcess: StudentInput[];
    if (body.mode === "bulk") {
      studentsToProcess = body.students;
    } else {
      studentsToProcess = [{ email: body.email, full_name: body.full_name, phone: body.phone }];
    }

    const results: StudentResult[] = [];
    const SITE_URL = Deno.env.get("SITE_URL") || "https://webuild.weskill.org";

    for (const student of studentsToProcess) {
      try {
        const email = student.email.trim().toLowerCase();
        const fullName = student.full_name.trim();
        const phone = student.phone?.trim() || null;

        if (!email || !email.includes("@")) {
          results.push({ email, status: "error", message: "Invalid email address" });
          continue;
        }

        if (!fullName) {
          results.push({ email, status: "error", message: "Name is required" });
          continue;
        }

        // Check if user already exists in auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });

        // listUsers doesn't support email filter via params, so we search by email
        const existingUser = null;

        // Use a more targeted approach: try to get user by email
        // We'll query the profiles table joined with auth concept, or use getUserByEmail (not available)
        // Actually, the best approach: try inviting and handle the duplicate error
        // OR: Look up all users — but that's expensive. Let's use a different approach.
        // We'll first check profiles for an existing user, and if not found, create via invite.

        // Strategy: Look up auth users by creating a dummy sign-in attempt won't work.
        // Best approach: Try to look up by email using admin API filtering
        // Supabase admin.listUsers doesn't have email filter, so let's try a workaround.
        
        // Check if profile exists by looking at auth.users via admin
        // We'll use the generateLink approach to check existence
        
        // Step 1: Check if a user with this email already has a profile
        // We need to check auth.users for the email. Let's use admin.listUsers and filter.
        // For production efficiency, we'll attempt the invite and handle errors.
        
        // First, let's try to find the user via the auth admin API
        let userId: string | null = null;
        let userExists = false;

        // Try to find existing user by email using admin API
        // We'll iterate through a targeted search
        const { data: userListData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (userListData?.users) {
          const found = userListData.users.find(
            (u: any) => u.email?.toLowerCase() === email
          );
          if (found) {
            userId = found.id;
            userExists = true;
          }
        }

        if (userExists && userId) {
          // User already exists — check if already in this batch
          const { data: existingEnrollment } = await supabaseAdmin
            .from("batch_students")
            .select("id")
            .eq("batch_id", batch_id)
            .eq("student_id", userId)
            .maybeSingle();

          if (existingEnrollment) {
            results.push({
              email,
              status: "already_enrolled",
              message: "Student already enrolled in this batch",
            });
            continue;
          }

          // Check if user is in any batch of ANY campus
          const { data: anyEnrollment } = await supabaseAdmin
            .from("batch_students")
            .select("id, batch_id")
            .eq("student_id", userId)
            .limit(1);

          // Link existing user to this batch
          const { error: linkError } = await supabaseAdmin
            .from("batch_students")
            .insert({ batch_id, student_id: userId });

          if (linkError) {
            results.push({ email, status: "error", message: linkError.message });
            continue;
          }

          // Update profile with phone if provided and not already set
          if (phone) {
            await supabaseAdmin
              .from("profiles")
              .update({ phone })
              .eq("id", userId)
              .is("phone", null);
          }

          results.push({
            email,
            status: "linked",
            message: "Existing student linked to your batch",
          });
        } else {
          // User doesn't exist — create via invite
          const { data: inviteData, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
              data: {
                full_name: fullName,
                role: "student",
                phone: phone,
              },
              redirectTo: `${SITE_URL}/dashboard`,
            });

          if (inviteError) {
            // Handle case where user exists but wasn't found (race condition or different search)
            if (inviteError.message?.includes("already been registered") || 
                inviteError.message?.includes("already exists")) {
              // Try to find and link them
              results.push({
                email,
                status: "error",
                message: "User may already exist. Please try again.",
              });
            } else {
              results.push({ email, status: "error", message: inviteError.message });
            }
            continue;
          }

          if (inviteData?.user) {
            const newUserId = inviteData.user.id;

            // Update the profile with additional data (the trigger may have already created it)
            // Wait a moment for the trigger to fire
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Update profile with full details
            await supabaseAdmin
              .from("profiles")
              .update({
                full_name: fullName,
                role: "student",
                phone: phone,
              })
              .eq("id", newUserId);

            // Add to batch
            const { error: batchStudentError } = await supabaseAdmin
              .from("batch_students")
              .insert({ batch_id, student_id: newUserId });

            if (batchStudentError) {
              results.push({
                email,
                status: "error",
                message: `User invited but failed to add to batch: ${batchStudentError.message}`,
              });
              continue;
            }

            results.push({
              email,
              status: "invited",
              message: `Invite sent to ${email}`,
            });
          } else {
            results.push({
              email,
              status: "error",
              message: "Failed to create user — no user data returned",
            });
          }
        }
      } catch (studentErr: any) {
        results.push({
          email: student.email,
          status: "error",
          message: studentErr.message || "Unknown error",
        });
      }
    }

    // Summarize
    const summary = {
      total: results.length,
      invited: results.filter((r) => r.status === "invited").length,
      linked: results.filter((r) => r.status === "linked").length,
      already_enrolled: results.filter((r) => r.status === "already_enrolled").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
