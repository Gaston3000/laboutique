import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";

const aiRouter = Router();

let anthropic = null;
function getAnthropic() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return null;
    }
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

function buildProductCatalog(products) {
  return products
    .map(
      (p) =>
        `[${p.id}] ${p.name} — ${p.brand || "Sin marca"} — $${Number(p.price_ars).toLocaleString("es-AR")} — Cat: ${(p.categories || []).join(", ") || "General"} — Stock: ${p.stock}`
    )
    .join("\n");
}

const SYSTEM_PROMPT = `Sos un asistente de compras de "La Boutique de la Limpieza", un ecommerce argentino de productos de limpieza, perfumería y hogar.

Tu tarea es interpretar lo que el usuario necesita y sugerir productos del catálogo que te proporcionan.

REGLAS ESTRICTAS:
- Solo podés sugerir productos que existan en el catálogo proporcionado.
- Cada producto sugerido debe incluir su ID exacto del catálogo.
- Sugeri entre 1 y 8 productos, los más relevantes.
- Si el usuario pide algo que no existe en el catálogo, decilo amablemente.
- Respondé siempre en español argentino, de forma breve y amigable.
- NO inventes productos ni IDs.

FORMATO DE RESPUESTA (JSON estricto):
{
  "message": "Breve mensaje amigable explicando la selección",
  "products": [
    { "id": 123, "quantity": 1, "reason": "Motivo breve de por qué se sugiere" }
  ]
}

Si no encontrás productos relevantes:
{
  "message": "Explicación amigable de por qué no se encontraron productos",
  "products": []
}

Respondé SOLO con el JSON, sin texto extra ni markdown.`;

aiRouter.post("/smart-order", async (req, res) => {
  const userMessage = String(req.body?.message || "").trim();

  if (!userMessage) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }

  if (userMessage.length > 500) {
    return res.status(400).json({ error: "El mensaje es demasiado largo (máx. 500 caracteres)" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "El servicio de IA no está configurado" });
  }

  try {
    const productsResult = await query(
      `SELECT id, name, brand, price_ars, categories, stock
       FROM products
       WHERE is_visible = true AND stock > 0
       ORDER BY name`
    );

    const catalog = buildProductCatalog(productsResult.rows);

    const client = getAnthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: `${SYSTEM_PROMPT}\n\nCATÁLOGO DISPONIBLE:\n${catalog}`,
      messages: [{ role: "user", content: userMessage }]
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";

    let parsed;
    try {
      // Strip markdown code blocks if present
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.json({ message: raw, products: [] });
    }

    const validProductIds = new Set(productsResult.rows.map((p) => p.id));
    const suggestedProducts = (parsed.products || [])
      .filter((p) => validProductIds.has(p.id))
      .map((p) => ({
        id: p.id,
        quantity: Math.max(1, Math.min(10, Number(p.quantity) || 1)),
        reason: String(p.reason || "").slice(0, 200)
      }));

    return res.json({
      message: String(parsed.message || ""),
      products: suggestedProducts
    });
  } catch (error) {
    console.error("Smart order error:", error.status, error.message);
    if (error.status === 429) {
      return res.status(503).json({ error: "El servicio de IA está temporalmente sin disponibilidad. Intentá más tarde." });
    }
    return res.status(500).json({ error: "No se pudo procesar tu pedido. Intentá de nuevo." });
  }
});

export default aiRouter;
