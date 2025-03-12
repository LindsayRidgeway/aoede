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

FORMAT REQUIREMENTS:
- Put each sentence on its own line with a line break after
- A sentence is defined as a complete thought with subject and verb
- Each line must contain EXACTLY ONE sentence
- Each sentence must end with a period, question mark, or exclamation point
- Never combine multiple sentences on one line
- Never use semicolons to join sentences

Examples of correct formatting:
The boy walks home.
He sees a dog.
The dog is big.
The boy pets the dog.

Example of incorrect formatting:
The boy walks home. He sees a dog.
The dog is big and the boy pets it.

Process the ENTIRE text I've provided, maintaining the full narrative.

FINAL CHECK: Before submitting your response, verify that EACH LINE contains EXACTLY ONE sentence ending with a period, question mark, or exclamation point. No exceptions.

DELIVER ONLY THE SIMPLIFIED TEXT WITH ONE SENTENCE PER LINE. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;