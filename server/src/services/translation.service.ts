import { env } from '../config/env.js';
import { AppError, ErrorCode } from '../errors/AppError.js';

/**
 * Common target languages, as DeepL language codes. Not every language DeepL
 * supports — a curated, useful subset, matching the same "curated, not
 * exhaustive" choice `ocr.service.ts` makes for OCR languages.
 */
export const TRANSLATE_LANGUAGES = [
  'EN',
  'ES',
  'FR',
  'DE',
  'IT',
  'PT',
  'NL',
  'PL',
  'RU',
  'JA',
  'ZH',
] as const;
export type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number];

export const TRANSLATE_LANGUAGE_LABELS: Record<TranslateLanguage, string> = {
  EN: 'English',
  ES: 'Spanish',
  FR: 'French',
  DE: 'German',
  IT: 'Italian',
  PT: 'Portuguese',
  NL: 'Dutch',
  PL: 'Polish',
  RU: 'Russian',
  JA: 'Japanese',
  ZH: 'Chinese',
};

/** A free-tier DeepL key always ends in `:fx`, which also determines the API host. */
function apiBaseUrl(apiKey: string): string {
  return apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
}

interface DeepLResponse {
  translations: { text: string; detected_source_language?: string }[];
}

export const translationService = {
  isConfigured(): boolean {
    return Boolean(env.DEEPL_API_KEY);
  },

  /**
   * Translates a batch of texts (DeepL supports many `text` fields in one
   * request, so a whole document's pages go in one call rather than one per
   * page). `sourceLang` omitted lets DeepL auto-detect it.
   */
  async translate(
    texts: string[],
    targetLang: TranslateLanguage,
    sourceLang?: string,
  ): Promise<{ translations: string[]; detectedSourceLang: string | null }> {
    const apiKey = env.DEEPL_API_KEY;
    if (!apiKey) {
      throw AppError.serviceUnavailable(
        ErrorCode.TRANSLATION_UNAVAILABLE,
        'Translation is not configured on this server. Set DEEPL_API_KEY to enable it.',
      );
    }

    const body = new URLSearchParams();
    for (const text of texts) body.append('text', text);
    body.append('target_lang', targetLang);
    if (sourceLang) body.append('source_lang', sourceLang);

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl(apiKey)}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch (cause) {
      throw AppError.internal('Could not reach the translation service.', { cause });
    }

    if (!response.ok) {
      // Never forward the provider's raw response — it can include account
      // details — but do distinguish "your key is bad" from "we're rate
      // limited" for a useful message.
      if (response.status === 403) {
        throw AppError.internal('The configured translation API key was rejected.');
      }
      if (response.status === 456) {
        throw AppError.tooManyRequests(
          ErrorCode.TRANSLATION_UNAVAILABLE,
          "This server's translation quota has been used up for now.",
        );
      }
      throw AppError.internal(`Translation service returned an unexpected error (${response.status}).`);
    }

    const data = (await response.json()) as DeepLResponse;
    return {
      translations: data.translations.map((entry) => entry.text),
      detectedSourceLang: data.translations[0]?.detected_source_language ?? null,
    };
  },
};
