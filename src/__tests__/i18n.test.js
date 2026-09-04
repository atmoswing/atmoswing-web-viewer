/**
 * @fileoverview Tests for i18n configuration and the locale files behind it.
 */

import {describe, expect, it} from 'vitest';

import i18n from '@/i18n.js';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

/**
 * Flattens a nested translation object into dotted key paths.
 * @param {Object} obj - Translation object
 * @param {string} [prefix] - Accumulated prefix
 * @returns {Array<string>} Sorted key paths
 */
function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (
    v && typeof v === 'object' && !Array.isArray(v)
      ? flattenKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  ));
}

describe('i18n', () => {
  it('initializes with French as the default and English as the fallback', () => {
    expect(i18n.language).toBe('fr');
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('registers both locales', () => {
    expect(Object.keys(i18n.options.resources).sort()).toEqual(['en', 'fr']);
  });

  it('translates a known key in both languages', () => {
    expect(i18n.t('panel.display', {lng: 'en'})).toBe('Display');
    expect(i18n.t('panel.display', {lng: 'fr'})).toBe('Affichage');
  });

  it('stamps the active language onto <html lang>', () => {
    // Screen readers and browser translation read this attribute; index.html ships the
    // default and i18n keeps it in step from here on.
    expect(document.documentElement.lang).toBe('fr');
  });

  it('updates <html lang> when the language changes', async () => {
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('interpolates values', () => {
    const out = i18n.t('seriesModal.analogWithIndex', {index: 3, lng: 'en'});
    expect(out).toContain('3');
  });
});

describe('locale files', () => {
  const enKeys = flattenKeys(en).sort();
  const frKeys = flattenKeys(fr).sort();

  it('define exactly the same keys, so neither language silently falls back', () => {
    expect(frKeys).toEqual(enKeys);
  });

  it('have no empty strings', () => {
    const empty = [];
    [['en', en], ['fr', fr]].forEach(([lang, data]) => {
      flattenKeys(data).forEach(path => {
        const value = path.split('.').reduce((acc, k) => acc?.[k], data);
        if (typeof value === 'string' && value.trim() === '') empty.push(`${lang}:${path}`);
      });
    });
    expect(empty).toEqual([]);
  });

  it('preserve accented French characters', () => {
    expect(fr.seriesModal.resolvingConfig).toMatch(/é/);
  });
});
