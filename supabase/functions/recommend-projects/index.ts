import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, skills } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get open projects
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, title, required_skills, category, budget_min, budget_max")
      .eq("status", "open")
      .limit(50);

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ recommended_ids: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple skill-matching fallback if no AI key
    if (!LOVABLE_API_KEY) {
      const userSkills = (skills || []).map((s: string) => s.toLowerCase());
      const scored = projects.map((p: any) => {
        const pSkills = (p.required_skills || []).map((s: string) => s.toLowerCase());
        const overlap = pSkills.filter((s: string) => userSkills.some((us: string) => s.includes(us) || us.includes(s))).length;
        return { id: p.id, score: overlap };
      }).sort((a: any, b: any) => b.score - a.score);

      return new Response(
        JSON.stringify({ recommended_ids: scored.filter((s: any) => s.score > 0).slice(0, 10).map((s: any) => s.id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI-powered recommendations
    const prompt = `Given a student with skills: ${(skills || []).join(", ")}\n\nAnd these available projects:\n${projects.map((p: any, i: number) => `${i + 1}. "${p.title}" - Skills: ${(p.required_skills || []).join(", ")} - Budget: $${p.budget_min}-$${p.budget_max}`).join("\n")}\n\nReturn the top recommended project numbers (1-indexed) for this student, ordered by best match. Only include projects where the student has relevant skills.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a project recommendation engine. Return only a JSON array of project numbers (1-indexed) sorted by relevance. Example: [3, 1, 7]" },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_projects",
            description: "Return ordered list of recommended project indices",
            parameters: {
              type: "object",
              properties: {
                indices: { type: "array", items: { type: "integer" }, description: "1-indexed project numbers" }
              },
              required: ["indices"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_projects" } },
      }),
    });

    if (!response.ok) {
      // Fallback to skill matching
      const userSkills = (skills || []).map((s: string) => s.toLowerCase());
      const scored = projects.map((p: any) => {
        const pSkills = (p.required_skills || []).map((s: string) => s.toLowerCase());
        const overlap = pSkills.filter((s: string) => userSkills.some((us: string) => s.includes(us) || us.includes(s))).length;
        return { id: p.id, score: overlap };
      }).sort((a: any, b: any) => b.score - a.score);

      return new Response(
        JSON.stringify({ recommended_ids: scored.filter((s: any) => s.score > 0).slice(0, 10).map((s: any) => s.id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let indices: number[] = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        indices = args.indices || [];
      } catch {
        indices = [];
      }
    }

    const recommendedIds = indices
      .filter((i: number) => i >= 1 && i <= projects.length)
      .map((i: number) => projects[i - 1].id);

    return new Response(
      JSON.stringify({ recommended_ids: recommendedIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, recommended_ids: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
