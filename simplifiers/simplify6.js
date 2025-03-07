// simplify6.js - Improved simplification prompt for 6-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 6) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Maximum sentence length: 6 words. This is a strict requirement.
2. Use only basic vocabulary a 6-year-old would know
3. Replace ALL complex words with simple alternatives
4. Use only basic grammar (subject-verb-object structure)
5. Avoid abstract concepts completely
6. Use very concrete, literal descriptions
7. Use present tense when possible
8. Repeat character names instead of using pronouns if there's any ambiguity
9. Break complex scenes into simple, step-by-step actions

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;