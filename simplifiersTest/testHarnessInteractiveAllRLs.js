import dotenv from 'dotenv';
import fetch from 'node-fetch';
import readline from 'readline';

import simplify6 from './simplify6.js';
import simplify9 from './simplify9.js';
import simplify12 from './simplify12.js';
import simplify15 from './simplify15.js';
import simplify18 from './simplify18.js';

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in .env file.");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const simplifiers = {
  6: simplify6,
  9: simplify9,
  12: simplify12,
  15: simplify15,
  18: simplify18,
};

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

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

const run = async () => {
  const sourceText = await askQuestion("📘 Paste your French sentence: ");

  for (const level of [6, 9, 12, 15, 18]) {
    const getPrompt = simplifiers[level];
    const prompt = getPrompt(sourceText, "French", "Russian", "English");

    console.log(`\n🧠 Sending to GPT-4o for RL ${level}...`);
    const output = await fetchGptResponse(prompt);
    console.log(`\n--- GPT-4o Output (RL ${level}) ---\n`);
    console.log(output);
  }

  rl.close();
};

run();
