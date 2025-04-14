import dotenv from 'dotenv';
import fetch from 'node-fetch';

import simplify6 from './simplify6.js';
import simplify9 from './simplify9.js';
import simplify12 from './simplify12.js';
import simplify15 from './simplify15.js';
import simplify18 from './simplify18.js';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in environment. Please add it to your .env file.");
  process.exit(1);
}

const simplifiers = {
  6: simplify6,
  9: simplify9,
  12: simplify12,
  15: simplify15,
  18: simplify18,
};

const sourceText = `Il était sept heures d’une soirée très chaude, sur les collines de Seeonee, quand père Loup s’éveilla de son somme journalier, se gratta, bâilla et détendit ses pattes l’une après l’autre pour dissiper la sensation de paresse qu’il sentait encore à leurs extrémités.`;

const bookLanguage = "French";
const studyLanguage = "Russian";
const userLanguage = "English";

const fetchGptResponse = async (prompt) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a translation and simplification assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "(No response)";
};

console.log("=== Aoede 1.1 Prompt Test via GPT-4o ===");

for (const level of [6, 9, 12, 15, 18]) {
  const getPrompt = simplifiers[level];
  const prompt = getPrompt(sourceText, bookLanguage, studyLanguage, userLanguage);
  console.log(`\n--- RL ${level} ---\n`);
  const output = await fetchGptResponse(prompt);
  console.log(output);
}
