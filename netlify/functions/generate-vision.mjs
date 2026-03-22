// generate-vision.mjs
// 1️⃣ Nano Banana / Google Gemini Imagen 3 → imagen real en base64
// 2️⃣ Claude Anthropic → descripción cinematográfica (fallback si no hay Gemini key)

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { prompt, type, projectData } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Falta el prompt" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const geminiKey = Netlify.env.get("GEMINI_API_KEY");
  const claudeKey = Netlify.env.get("ANTHROPIC_API_KEY");

  // ── 1. Nano Banana = Google Gemini Imagen 3 (imagen real) ─────────────────
  if (geminiKey) {
    try {
      const imageBase64 = await generateWithGemini(prompt, type, geminiKey);
      return new Response(
        JSON.stringify({ success: true, source: "gemini", imageBase64 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Gemini Imagen error:", err.message);
      // Continúa al fallback de Claude
    }
  }

  // ── 2. Claude Anthropic (descripción cinematográfica) ─────────────────────
  if (claudeKey) {
    try {
      const description = await generateWithClaude(prompt, type, claudeKey);
      return new Response(
        JSON.stringify({ success: true, source: "claude", description }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Claude error:", err.message);
    }
  }

  // ── Sin keys configuradas ──────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      success: false,
      source: "none",
      missingKeys: {
        gemini: !geminiKey,
        claude: !claudeKey,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE GEMINI IMAGEN 3 (Nano Banana)
// Docs: https://ai.google.dev/gemini-api/docs/image-generation
// ─────────────────────────────────────────────────────────────────────────────
async function generateWithGemini(prompt, type, apiKey) {
  const enhancedPrompt = buildImagePrompt(prompt, type);

  // Gemini Imagen 3 endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: enhancedPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: type === "interior" ? "4:3" : "16:9",
        safetyFilterLevel: "block_only_high",
        personGeneration: "dont_allow",
        outputOptions: { mimeType: "image/jpeg", compressionQuality: 85 },
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini HTTP ${resp.status}: ${err.substring(0, 200)}`);
  }

  const data = await resp.json();
  const base64 = data?.predictions?.[0]?.bytesBase64Encoded;

  if (!base64) {
    throw new Error("Gemini no retornó imagen: " + JSON.stringify(data).substring(0, 200));
  }

  return base64;
}

function buildImagePrompt(userPrompt, type) {
  const base = type === "interior"
    ? "Professional interior architectural photography of a custom mobile office unit in Chile. " +
      "Modern minimalist design, LED lighting, built-in furniture, clean white walls, professional workspace. " +
      "Wide angle lens, ultra sharp, 4K quality. No people. "
    : "Professional automotive photography of a custom commercial mobile unit van in Chile. " +
      "Photorealistic render, dramatic cinematic lighting, clean composition, parked in urban environment. " +
      "Ultra detailed, no people, 4K quality. ";

  return base + userPrompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE ANTHROPIC (fallback — descripción texto)
// ─────────────────────────────────────────────────────────────────────────────
async function generateWithClaude(prompt, type, apiKey) {
  const label = type === "interior"
    ? "interior del vehículo implementado"
    : "exterior con branding corporativo";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Eres un director creativo especializado en vehículos comerciales y unidades móviles en Chile. Escribe una memoria descriptiva visual épica del ${label}. Estructura en 4 párrafos con títulos en **negrita**. Lenguaje cinematográfico, extremadamente específico y evocador. Español.\n\nPrompt: ${prompt}`,
      }],
    }),
  });

  const data = await resp.json();
  return data.content?.[0]?.text || "No se pudo generar la descripción.";
}

export const config = {
  path: "/api/generate-vision",
};
