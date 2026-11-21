import { Injectable } from '@angular/core';
import { AnsiSpan } from '../models/logs.model';

const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;

const FG_COLORS: Record<number, string> = {
  30: 'ansi-black',
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-yellow',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  36: 'ansi-cyan',
  37: 'ansi-white',
  90: 'ansi-bright-black',
  91: 'ansi-bright-red',
  92: 'ansi-bright-green',
  93: 'ansi-bright-yellow',
  94: 'ansi-bright-blue',
  95: 'ansi-bright-magenta',
  96: 'ansi-bright-cyan',
  97: 'ansi-bright-white',
};

const BG_COLORS: Record<number, string> = {
  40: 'ansi-bg-black',
  41: 'ansi-bg-red',
  42: 'ansi-bg-green',
  43: 'ansi-bg-yellow',
  44: 'ansi-bg-blue',
  45: 'ansi-bg-magenta',
  46: 'ansi-bg-cyan',
  47: 'ansi-bg-white',
  100: 'ansi-bg-bright-black',
  101: 'ansi-bg-bright-red',
  102: 'ansi-bg-bright-green',
  103: 'ansi-bg-bright-yellow',
  104: 'ansi-bg-bright-blue',
  105: 'ansi-bg-bright-magenta',
  106: 'ansi-bg-bright-cyan',
  107: 'ansi-bg-bright-white',
};

@Injectable({ providedIn: 'root' })
export class AnsiParserService {
  parseToSpans(text: string): AnsiSpan[] {
    if (!text) return [];
    if (!text.includes('\x1b[')) {
      return [{ text, classes: [] }];
    }

    const spans: AnsiSpan[] = [];
    let currentClasses: string[] = [];
    let lastIndex = 0;

    let match: RegExpExecArray | null;
    ANSI_REGEX.lastIndex = 0;

    while ((match = ANSI_REGEX.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        const chunk = text.slice(lastIndex, matchIndex);
        if (chunk) {
          spans.push({ text: chunk, classes: [...currentClasses] });
        }
      }

      const codes = (match[1] || '0')
        .split(';')
        .map((c) => parseInt(c, 10))
        .filter((c) => !isNaN(c));

      for (const code of codes) {
        if (code === 0) {
          currentClasses = [];
        } else if (code === 1) {
          if (!currentClasses.includes('ansi-bold')) currentClasses.push('ansi-bold');
        } else if (code === 2) {
          if (!currentClasses.includes('ansi-dim')) currentClasses.push('ansi-dim');
        } else if (code === 3) {
          if (!currentClasses.includes('ansi-italic')) currentClasses.push('ansi-italic');
        } else if (code === 4) {
          if (!currentClasses.includes('ansi-underline')) currentClasses.push('ansi-underline');
        } else if (code in FG_COLORS) {
          currentClasses = currentClasses.filter((c) => !c.startsWith('ansi-') || c.startsWith('ansi-bg-') || c === 'ansi-bold' || c === 'ansi-dim' || c === 'ansi-italic' || c === 'ansi-underline');
          currentClasses.push(FG_COLORS[code]);
        } else if (code in BG_COLORS) {
          currentClasses = currentClasses.filter((c) => !c.startsWith('ansi-bg-'));
          currentClasses.push(BG_COLORS[code]);
        }
      }

      lastIndex = ANSI_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining) {
        spans.push({ text: remaining, classes: [...currentClasses] });
      }
    }

    return spans;
  }
}
