#!/bin/bash
echo "🔍 Scanning for outbound API calls in .js files..."

echo ""
echo "📌 Looking for fetch() calls..."
grep -rn "fetch(" *.js

echo ""
echo "📌 Looking for axios references..."
grep -rn "axios" *.js

echo ""
echo "📌 Looking for Speech synthesis (TTS)..."
grep -rn "Speech\." *.js

echo ""
echo "📌 Looking for OpenAI URLs or keys..."
grep -rn "openai" *.js

echo ""
echo "📌 Looking for Google APIs..."
grep -rn "googleapis" *.js

echo ""
echo "📌 Looking for use of apiKey or API_KEY variables..."
grep -rn "API_KEY" *.js
grep -rn "apiKey" *.js

echo ""
echo "✅ Done scanning. Review the results above."