import { Router } from "express";
import OpenAI from "openai";
import { query } from "../db.js";

const aiRouter = Router();

let openai = null;
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function buildProductCatalog(products) {
  return products.map((p) => `[${p.id}] ${p.name} — ${p.brand || "Sin marca"} — $${Number(p.price_ars).toLocaleString("es-AR")} — Cat: ${(p.categories || []).join(", ") || "General"} — Stock: ${p.stock}`).join("\n");
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

  if (!process.env.OPENAI_API_KEY) {
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

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nCATÁLOGO DISPONIBLE:\n${catalog}` },
        { role: "user", content: userMessage }
      ]
    });

    const raw = completion.choices[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
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
    console.error("Smart order error:", error.message);
    return res.status(500).json({ error: "No se pudo procesar tu pedido. Intentá de nuevo." });
  }
});

export default aiRouter;
