// simplify9.js - Simplification prompt for 9-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 9) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them for a ${ageGroup}-year-old native speaker of ${targetLanguage}.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Maximum sentence length: 9 words. Split longer sentences into multiple shorter ones.
2. Use vocabulary that a 9-year-old native speaker would easily understand
3. Simplify complex concepts but don't remove them completely
4. Use concrete language instead of abstract terminology
5. Keep pronouns clear and easy to follow
6. Use simple verb tenses when possible
7. Maintain the emotion and tone of the original where possible

Process the ENTIRE text I've provided, maintaining the full narrative.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;