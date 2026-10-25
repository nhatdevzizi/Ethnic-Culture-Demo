import rawFacts from '../../content/facts.json';
import vi from '../../i18n/vi.json';
import en from '../../i18n/en.json';
import type { LearningFact, Localized, Locale } from './types';
export const facts = rawFacts as LearningFact[];
export type TextKey = keyof typeof vi;
export function text(key: string, locale: Locale): string {
  return (locale === 'en' ? en : vi)[key as TextKey] ?? vi[key as TextKey] ?? key;
}
export const localize = (value: Localized, locale: Locale) => value[locale] ?? value.vi;
