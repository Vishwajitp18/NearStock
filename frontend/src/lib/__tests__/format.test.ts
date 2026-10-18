import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatINR,
  formatDistance,
  formatDuration,
  formatRelativeTime,
  formatDate,
} from '../format';

describe('format utilities', () => {
  it('formats currency in Indian Rupees (INR)', () => {
    expect(formatCurrency(285)).toContain('285');
    expect(formatINR(1250.5)).toContain('1,250.5');
  });

  it('formats distance in meters and kilometers correctly', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(1200)).toBe('1.2 km');
    expect(formatDistance(5432)).toBe('5.4 km');
  });

  it('formats duration in minutes and hours', () => {
    expect(formatDuration(30)).toBe('< 1 min');
    expect(formatDuration(240)).toBe('4 min');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(4500)).toBe('1h 15m');
  });

  it('formats relative time accurately', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('Just now');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60000);
    expect(formatRelativeTime(tenMinutesAgo.toISOString())).toBe('10m ago');

    const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
    expect(formatRelativeTime(threeHoursAgo.toISOString())).toBe('3h ago');
  });

  it('formats date to readable Indian standard date', () => {
    const sampleDate = '2026-10-18T12:00:00Z';
    const formatted = formatDate(sampleDate);
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });
});

