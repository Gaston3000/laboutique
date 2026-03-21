import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testConnection() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Decime si esta API funciona correctamente en una frase corta" }
      ],
      max_tokens: 100
    });

    const message = response.choices[0]?.message?.content;
    console.log(`✅ RESPUESTA: ${message}`);
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }
}

testConnection();
