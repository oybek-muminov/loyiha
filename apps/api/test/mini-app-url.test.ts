import { describe, expect, it } from 'vitest';
import { isHttpsUrl, miniAppUrl } from '../src/bot/mini-app-url';

describe('miniAppUrl', () => {
  it('joins base and path', () => {
    expect(miniAppUrl('https://univeracademy.uz/tg', '/path/fizika')).toBe(
      'https://univeracademy.uz/tg/path/fizika',
    );
  });

  it('handles missing leading slash', () => {
    expect(miniAppUrl('https://univeracademy.uz/tg', 'lesson/1')).toBe(
      'https://univeracademy.uz/tg/lesson/1',
    );
  });

  it('trims trailing slash on base', () => {
    expect(miniAppUrl('https://univeracademy.uz/tg/', '/a')).toBe(
      'https://univeracademy.uz/tg/a',
    );
  });

  it('returns base when path empty', () => {
    expect(miniAppUrl('http://localhost:3000/tg')).toBe(
      'http://localhost:3000/tg',
    );
  });
});

describe('isHttpsUrl', () => {
  it('detects https only', () => {
    expect(isHttpsUrl('https://a.uz')).toBe(true);
    expect(isHttpsUrl('http://localhost:3000')).toBe(false);
  });
});
