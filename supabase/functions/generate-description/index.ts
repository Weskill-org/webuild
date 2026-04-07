import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  title: string;
  category: string;
  sub_category?: string;
  key_features: string;
  objectives: string;
  tone: "formal" | "technical" | "simple";
  required_skills?: string;
}

function buildPrompt(input: GenerateRequest): string {
  const toneDescriptions = {
    formal: "professional, corporate, and polished",
    technical: "detailed, technical, and precise with industry-specific terminology",
    simple: "clear, easy to understand, and accessible to a broad audience",
  };

  return `Generate a high-quality project description for a platform where companies post projects for students and professionals to work on.

Project Title: ${input.title}
Category: ${input.category}${input.sub_category ? ` > ${input.sub_category}` : ""}
Key Features / Scope: ${input.key_features || "Not specified"}
Objectives / Goals: ${input.objectives || "Not specified"}
Required Skills: ${input.required_skills || "Not specified"}
Tone: ${toneDescriptions[input.tone]}

Requirements:
- Write a well-structured, human-like project description (150-300 words)
- Include a brief overview paragraph
- List key deliverables or scope items as bullet points
- Mention expected outcomes
- Use the specified tone consistently
- Make it suitable for both companies and students
- Do NOT include the project title as a heading
- Do NOT use markdown headers (##), just plain text with bullet points (•)
- Return ONLY the description text, nothing else`;
}

function generateFallback(input: GenerateRequest): string {
  const { title, category, sub_category, key_features, objectives, required_skills } = input;
  
  const features = key_features
    ? key_features.split(",").map((f) => `• ${f.trim()}`).join("\n")
    : "• To be discussed with the selected team";

  const goals = objectives
    ? objectives.split(",").map((o) => `• ${o.trim()}`).join("\n")
    : "• Deliver a high-quality solution on time";

  return `We are looking for talented individuals to work on "${title}" — a ${category}${sub_category ? ` (${sub_category})` : ""} project.

This project involves developing a comprehensive solution that meets modern industry standards. The ideal candidate(s) should demonstrate strong expertise${required_skills ? ` in ${required_skills}` : ""} and a passion for delivering excellence.

Key Deliverables:
${features}

Project Objectives:
${goals}

We value clear communication, timely delivery, and attention to detail. This is a great opportunity for students and professionals looking to build their portfolio with real-world experience.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: GenerateRequest = await req.json();

    if (!input.title) {
      return new Response(
        JSON.stringify({ error: "Project title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Try Lovable gateway first, then direct Gemini, then fallback
    if (LOVABLE_API_KEY) {
      const prompt = buildPrompt(input);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are an expert project description writer for a freelancing/internship platform. You write clear, professional, and engaging project descriptions that attract top talent. Return only the description text without any titles, headers, or metadata.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const description = result.choices?.[0]?.message?.content?.trim();

        if (description) {
          return new Response(
            JSON.stringify({ description }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Try direct Gemini API
    if (GEMINI_API_KEY) {
      const prompt = buildPrompt(input);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert project description writer for a freelancing/internship platform. You write clear, professional, and engaging project descriptions that attract top talent.\n\n${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const description = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (description) {
          return new Response(
            JSON.stringify({ description }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fallback: template-based generation
    const description = generateFallback(input);
    return new Response(
      JSON.stringify({ description, fallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error generating description:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
