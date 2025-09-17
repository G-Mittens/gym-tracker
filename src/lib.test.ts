import { describe, it, expect } from 'vitest';
import { mmssToSeconds, secondsToMMSS } from './lib';

describe('time helpers', () => {
  it('converts mm:ss to seconds', () => {
    expect(mmssToSeconds('1', '30')).toBe(90);
    expect(mmssToSeconds('0', '45')).toBe(45);
  });

  it('formats seconds to mm:ss', () => {
    expect(secondsToMMSS(90)).toBe('1:30');
    expect(secondsToMMSS(5)).toBe('0:05');
  });

  it('round-trip safe', () => {
    const s = 123;
    const [m, sec] = secondsToMMSS(s).split(':');
    expect(mmssToSeconds(m, sec)).toBe(s);
  });
});
