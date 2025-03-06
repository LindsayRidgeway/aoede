// simplify18.js - Simplification prompt for 18-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 18) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Replace only highly specialized terminology or obscure references with more accessible equivalents
2. Break down only extremely complex sentences (30+ words)
3. Use vocabulary appropriate for a college-level reader
4. Maintain all abstract concepts and literary devices
5. Preserve the style and tone of the original when possible
6. Keep most complex sentence structures intact unless they're unusually difficult
7. Target sentence length: 15-25 words, longer when appropriate
8. Each simplified sentence must maintain the depth and nuance of the original when possible

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;