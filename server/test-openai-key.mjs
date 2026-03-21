import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
try {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini', max_tokens: 10,
    messages: [{ role: 'user', content: 'di hola' }]
  });
  console.log('OpenAI OK:', r.choices[0].message.content);
} catch(e) {
  console.error('OpenAI ERROR:', e.status, e.message);
}
