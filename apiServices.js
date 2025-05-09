// apiServices.js - API service functions for Aoede
import { getConstantValue } from './apiUtilsXXX';

// Import all simplification prompts statically
import getSimplificationPrompt6 from './simplifiers/simplify6';
import getSimplificationPrompt9 from './simplifiers/simplify9';
import getSimplificationPrompt12 from './simplifiers/simplify12';
import getSimplificationPrompt15 from './simplifiers/simplify15';
import getSimplificationPrompt18 from './simplifiers/simplify18';

// Get API keys using updated function
const anthropicKey = getConstantValue('ANTHROPIC_API_KEY');
const googleKey = getConstantValue('GOOGLE_API_KEY');
const openaiKey = getConstantValue('OPENAI_API_KEY');
export const CORS_PROXY = getConstantValue('CORS_PROXY') || '';

// Function to get the appropriate simplification prompt based on reading level
export const getPromptForLevel = (readingLevel) => {
  if (__DEV__) console.log("MODULE 0028: apiServices.getPromptForLevel");

  const level = readingLevel || 6;

  const promptMap = {
    6: getSimplificationPrompt6,
    9: getSimplificationPrompt9,
    12: getSimplificationPrompt12,
    15: getSimplificationPrompt15,
    18: getSimplificationPrompt18
  };

  return promptMap[level] || getSimplificationPrompt6;
};

// Process the source text - translate and simplify
export const processSourceText = async (sourceText, bookLang, studyLang, userLang, readingLevel = 6) => {
  if (__DEV__) console.log("MODULE 0029: apiServices.processSourceText");

  const openaiKey = getConstantValue('OPENAI_API_KEY');
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const getPrompt = getPromptForLevel(readingLevel);
  const prompt = getPrompt(sourceText, bookLang, studyLang, userLang);

  if (__DEV__) console.log("FETCH 0003");
  if (__DEV__) console.log("MODULE 0030: apiServices.processSourceText.fetch");

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return null;
    }

    return data.choices[0].message.content;
  } catch (error) {
    return null;
  }
};