// simplify12.js - Simplification prompt for 12-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 12) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Replace very complex vocabulary with more accessible words
2. Break down sentences longer than 15-18 words into multiple shorter sentences
3. Use vocabulary appropriate for a ${ageGroup}-year-old with a good reading level
4. Maintain some abstract concepts but explain them clearly when needed
5. Use more varied sentence structures appropriate for middle-school readers
6. Split very complex sentences with multiple clauses but maintain some compound sentences
7. Target sentence length: 8-15 words, maximum 18 words
8. Each simplified sentence must be clear and comprehensible to a ${ageGroup}-year-old

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;