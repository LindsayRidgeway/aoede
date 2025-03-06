// simplify15.js - Simplification prompt for 15-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 15) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Replace only specialized or archaic vocabulary with more contemporary equivalents
2. Break down sentences longer than 20-25 words into multiple sentences
3. Use vocabulary appropriate for a high school student
4. Maintain abstract concepts but provide context when necessary
5. Use varied sentence structures including some complex sentences
6. Maintain some literary qualities of the original when appropriate
7. Target sentence length: 10-20 words, maximum 25 words
8. Each simplified sentence must be clear and comprehensible to a ${ageGroup}-year-old

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;