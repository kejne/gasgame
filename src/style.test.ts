import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const stylesheet = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

describe('modal overlay visibility contract', () => {
  it('removes both overlays from layout when their native hidden attribute is set', () => {
    expect(stylesheet).toMatch(/\.store-overlay\[hidden\][^{]*,\s*\.character-overlay\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/);
  });
});

describe('minimap layout contract', () => {
  it('uses fixed tracks with no separators and keeps markers out of cell sizing', () => {
    expect(stylesheet).toMatch(/grid-template-columns:\s*repeat\(15,\s*minmax\(0,\s*1fr\)\)/);
    expect(stylesheet).toMatch(/grid-template-rows:\s*repeat\(15,\s*minmax\(0,\s*1fr\)\)/);
    expect(stylesheet).toMatch(/\.minimap[^}]*gap:\s*0;/s);
    expect(stylesheet).toMatch(/\.minimap-cell\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(stylesheet).toMatch(/\.minimap-marker\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
  });
});
