// simplify9.js - Improved simplification prompt for 9-year-old reading level

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

FORMAT REQUIREMENTS:
- Put each sentence on its own line with a line break after
- A sentence is defined as a complete thought with subject and verb
- Each line must contain EXACTLY ONE sentence
- Each sentence must end with a period, question mark, or exclamation point
- Never combine multiple sentences on one line
- Never use semicolons to join sentences

Examples of correct formatting:
The girl went to the store.
She wanted to buy candy.
Her mother said no.
She was disappointed but understood why.

Example of incorrect formatting:
The girl went to the store. She wanted to buy candy.
Her mother said no and she was disappointed.

Process the ENTIRE text I've provided, maintaining the full narrative.

FINAL CHECK: Before submitting your response, verify that EACH LINE contains EXACTLY ONE sentence ending with a period, question mark, or exclamation point. No exceptions.

DELIVER ONLY THE SIMPLIFIED TEXT WITH ONE SENTENCE PER LINE. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;