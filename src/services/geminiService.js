const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let _cachedGeminiModel = null;

const getGeminiModel = async (apiKey) => {
  if (_cachedGeminiModel) return _cachedGeminiModel;
  try {
    const res = await fetch(`${GEMINI_BASE}/models?key=${apiKey}`);
    if (!res.ok) return 'gemini-2.0-flash';
    const data = await res.json();
    const model = (data.models || []).find(
      (m) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name.includes('gemini')
    );
    const name = model?.name?.replace('models/', '') || 'gemini-2.0-flash';
    _cachedGeminiModel = name;
    return name;
  } catch {
    return 'gemini-2.0-flash';
  }
};

const SPLIT_PROMPT = `You are a sentence parser for an English learning app.
Split the English passage into every individual sentence and pair each with Korean.

CRITICAL RULES:
- Include EVERY sentence from the passage. Do NOT skip any.
- Copy each English sentence exactly as written - no changes at all.
- If Korean translation is provided, split it to match each English sentence (adjust splits so sentence counts match).
- If no Korean translation is provided, write accurate Korean translation for each sentence.
- Return ONLY raw JSON with no markdown, no code blocks, no extra text.

Output format (strictly):
{"sentences":[{"en":"English sentence here.","ko":"한국어 번역."}]}`;

const SYSTEM_PROMPT = `You are an English study material generator for Korean students. Given an English passage, generate structured study materials.

ABSOLUTE RULE: Never modify, paraphrase, or alter the original English passage text in any way. All English content in type1 sentences, type3 sentences, and type4 sentences must be copied verbatim from the original passage. Do not rewrite, simplify, or change any English wording.

CRITICAL: Respond with ONLY a valid JSON object. No markdown formatting, no code blocks, no additional text before or after. Just the raw JSON.

The JSON must follow this exact structure:
{
  "title": "Clear meaningful Korean title summarizing the passage topic (max 20 chars). NEVER repeat characters. NEVER output gibberish or random syllables. Example good titles: 기후변화와 경제, 인공지능의 미래, 우주탐사의 도전. Write a real descriptive title.",
  "summary": "Structured Korean analysis. Format it with clear section labels like [주제], [배경 및 맥락], [핵심 논점], [결론 및 시사점]. Put two newlines between sections. Write detailed content under each section using bullet points starting with • symbol.",
  "vocabulary": [
    {"word": "English word or phrase", "meaning": "Korean meaning"}
  ],
  "flow": ["Korean one-sentence summary of point 1", "Korean one-sentence summary of point 2"],
  "workbook": {
    "type1": [
      {
        "sentence": "Complete English sentence from the passage",
        "meaning": "Korean translation of this sentence"
      }
    ],
    "type3": ["First complete English sentence from the passage.", "Second complete English sentence from the passage.", "...and so on for EVERY sentence"],
    "type4": [
      {
        "blanked": "Sentence with the main verb replaced by _____",
        "answer": "exactVerbFormFromPassage"
      }
    ]
  }
}

STRICT LANGUAGE RULES — this is critical:
- title: KOREAN only, max 20 characters. Must be a meaningful phrase describing the passage topic. No repeated syllables, no random characters.
- summary: KOREAN only
- vocabulary[].word: ENGLISH only (the English word or phrase)
- vocabulary[].meaning: KOREAN only (Korean definition)
- workbook.type1[].sentence: ENGLISH only (copied from the passage)
- workbook.type1[].meaning: KOREAN only (Korean translation of that sentence)
- workbook.type3[]: ENGLISH only — each element is ONE complete sentence copied verbatim from the passage
- workbook.type4[].blanked: ENGLISH only — copy the sentence verbatim from the passage, replace ONE main verb with exactly "_____" (five underscores)
- workbook.type4[].answer: ENGLISH only — the EXACT verb form as it appears in the original passage (e.g., "analyzed", "has been studying", "were implemented") — never use base/infinitive form
- flow[]: KOREAN only — concise one-line Korean sentences

Additional rules:
- vocabulary: Extract meaningful English words from the passage at intermediate level or above. Exclude ALL of the following: articles (a/an/the), basic be-verbs (is/are/was/were/be/been/being), pronouns (I/you/he/she/it/we/they/my/your/his/her/its/our/their), conjunctions (and/or/but/so/yet/nor), basic prepositions (in/on/at/to/of/by/for/from/with/about/into/onto/upon/off/out/up/down/over/under/through/between/among/during/before/after/since/until/while/than/as), very common verbs (go/come/see/watch/get/make/do/say/know/think/look/want/use/find/give/tell/seem/feel/try/leave/call/keep/let/put/show/hear/play/run/move/live/work/stand/set/turn/begin/help/start/bring/hold/write/ask/open/appear/buy/eat/happen/take/have/need), numbers, and very short function words. For VERBS: always write the base/infinitive form (e.g., studied→study, running→run, improved→improve). For NOUNS: always write the singular base form (e.g., symbols→symbol, countries→country, analyses→analysis, abilities→ability). Aim for 15 to 30 items. No duplicates.
- flow: Korean one-sentence summary for EVERY sentence in the passage, in order, without skipping any. Each item captures exactly one sentence from the original. Typically 8 to 15 items depending on passage length.
- type1: ALL sentences from the passage, each with Korean meaning. Include EVERY sentence without exception. Do NOT skip any sentence.
- type3: SENTENCE ORDERING — Split the passage into EVERY individual sentence, one per array element, in original order. Do NOT group sentences into paragraphs or chunks. Do NOT skip or omit any sentence. Do NOT paraphrase. Copy each sentence verbatim from the passage. The result must contain ALL sentences from the passage without exception.
- type4: 8 to 12 sentences from the passage, each with ONE main verb blanked as "_____". COMPLETENESS RULE: Include all required items. The answer must be the exact verb form from the original text (conjugated, not base form). Do NOT stop generating early due to length.
- All content must be educationally accurate
- IMPORTANT: Generate ALL required sentences for type1, type3, and type4 completely. Do not truncate the output.`;

const buildUserTranslationPrompt = (userTranslation) => `
IMPORTANT: The user has provided their own Korean translation of this passage below. You MUST use this translation as the authoritative basis for:
- summary: Derive all Korean analysis from this translation
- flow[]: Each Korean one-sentence summary must reflect the meaning in this translation
- workbook.type1[].meaning: Each Korean sentence meaning must match this translation (find the corresponding part)
Do NOT ignore or override the user's translation. Treat it as ground truth for all Korean content.

User's Korean translation:
"""
${userTranslation}
"""
`;

const callGemini = async (apiKey, body, retried = false) => {
  const model = await getGeminiModel(apiKey);
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 429) {
    if (!retried) {
      await new Promise((r) => setTimeout(r, 35000));
      return callGemini(apiKey, body, true);
    }
    throw new Error('Gemini 무료 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 내일 다시 이용해주세요.');
  }
  return response;
};

const generateWithGemini = async (apiKey, passageText, userTranslation) => {
  const translationBlock = userTranslation ? buildUserTranslationPrompt(userTranslation) : '';
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_PROMPT}${translationBlock}\n\nPassage to analyze:\n"""\n${passageText}\n"""`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };

  const response = await callGemini(apiKey, body);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || '';
    if (response.status === 403) throw new Error('Gemini API 키가 유효하지 않습니다. 설정에서 키를 확인해주세요.');
    if (response.status === 500 || response.status === 503) throw new Error('Gemini 서버 오류입니다. 잠시 후 다시 시도해주세요.');
    throw new Error(msg || `Gemini API 오류: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('지문이 너무 깁니다. 더 짧은 지문을 사용해주세요.');
  }
  if (finishReason === 'SAFETY') {
    throw new Error('안전 정책으로 인해 생성이 차단됐습니다. 다른 지문을 사용해주세요.');
  }
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) throw new Error('API 응답이 비어있습니다.');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new SyntaxError(`JSON not found in response: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
};

const generateWithGroq = async (apiKey, passageText, userTranslation) => {
  const translationBlock = userTranslation ? buildUserTranslationPrompt(userTranslation) : '';
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${translationBlock}Passage to analyze:\n"""\n${passageText}\n"""`,
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || '';
    if (response.status === 429) throw new Error('Groq 무료 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 내일 다시 이용해주세요.');
    if (response.status === 401) throw new Error('Groq API 키가 유효하지 않습니다. 설정에서 키를 확인해주세요.');
    if (response.status === 500 || response.status === 503) throw new Error('Groq 서버 오류입니다. 잠시 후 다시 시도해주세요.');
    throw new Error(msg || `Groq API 오류: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('API 응답이 비어있습니다.');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new SyntaxError(`JSON not found in response`);
  }
  return JSON.parse(text.slice(start, end + 1));
};

const splitWithGemini = async (apiKey, passageText, userTranslation) => {
  const userContent = userTranslation
    ? `Passage:\n"""\n${passageText}\n"""\n\nKorean translation to use:\n"""\n${userTranslation}\n"""`
    : `Passage:\n"""\n${passageText}\n"""`;
  const body = {
    contents: [{ parts: [{ text: `${SPLIT_PROMPT}\n\n${userContent}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };
  const response = await callGemini(apiKey, body);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API 오류: ${response.status}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('API 응답이 비어있습니다.');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new SyntaxError('JSON not found');
  const parsed = JSON.parse(text.slice(start, end + 1));
  return Array.isArray(parsed.sentences) ? parsed.sentences : [];
};

const splitWithGroq = async (apiKey, passageText, userTranslation) => {
  const userContent = userTranslation
    ? `Passage:\n"""\n${passageText}\n"""\n\nKorean translation to use:\n"""\n${userTranslation}\n"""`
    : `Passage:\n"""\n${passageText}\n"""`;
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SPLIT_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API 오류: ${response.status}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('API 응답이 비어있습니다.');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const parsed = JSON.parse(text.slice(start, end + 1));
  return Array.isArray(parsed.sentences) ? parsed.sentences : [];
};

export const splitPassageIntoSentences = async (settings, passageText, userTranslation) => {
  try {
    if (settings.aiProvider === 'groq') {
      return await splitWithGroq(settings.groqApiKey, passageText, userTranslation);
    }
    return await splitWithGemini(settings.apiKey, passageText, userTranslation);
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error('AI 응답 형식 오류입니다. 다시 시도해주세요.');
    throw e;
  }
};

export const generateStudyMaterials = async (settings, passageText, userTranslation, confirmedPairs) => {
  try {
    let result;
    if (settings.aiProvider === 'groq') {
      result = await generateWithGroq(settings.groqApiKey, passageText, userTranslation);
    } else {
      result = await generateWithGemini(settings.apiKey, passageText, userTranslation);
    }
    // Override type1 and type3 with user-confirmed sentence pairs (never let AI modify them)
    if (confirmedPairs?.length > 0) {
      result.workbook = result.workbook || {};
      result.workbook.type1 = confirmedPairs.map(p => ({ sentence: p.en, meaning: p.ko }));
      result.workbook.type3 = confirmedPairs.map(p => p.en);
    }
    return result;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('AI 응답 형식 오류입니다. 다시 시도해주세요. (지문이 너무 짧거나 특수문자가 많으면 실패할 수 있습니다)');
    }
    throw e;
  }
};

export const testApiKey = async (settings) => {
  try {
    if (settings.aiProvider === 'groq') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 10,
        }),
      });
      if (response.ok) return { ok: true };
      const err = await response.json().catch(() => ({}));
      return { ok: false, message: err?.error?.message || `HTTP ${response.status}` };
    }
    const model = await getGeminiModel(settings.apiKey);
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${settings.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    if (response.ok) return { ok: true };
    const err = await response.json().catch(() => ({}));
    return { ok: false, message: err?.error?.message || `HTTP ${response.status}` };
  } catch (e) {
    return { ok: false, message: e.message || '네트워크 오류' };
  }
};
