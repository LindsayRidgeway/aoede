// simplify12.js - Simplification prompt for 12-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 12) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them for a ${ageGroup}-year-old native speaker of ${targetLanguage}.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Maximum sentence length: 12 words. Split longer sentences into multiple shorter ones.
2. Use vocabulary that a 12-year-old native speaker would understand
3. Simplify complex concepts but retain the core meaning
4. You can use more nuanced language than for younger readers
5. Some figurative language is acceptable if it's clear
6. Maintain the original tone and style where possible
7. Can include some more complex sentence structures as long as they're clear

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;