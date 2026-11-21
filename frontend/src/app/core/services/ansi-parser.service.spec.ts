import { TestBed } from '@angular/core/testing';
import { AnsiParserService } from './ansi-parser.service';

describe('AnsiParserService', () => {
  let service: AnsiParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnsiParserService],
    });
    service = TestBed.inject(AnsiParserService);
  });

  it('should return plain text span when no ANSI codes present', () => {
    const res = service.parseToSpans('Standard plain log line');
    expect(res.length).toBe(1);
    expect(res[0].text).toBe('Standard plain log line');
    expect(res[0].classes).toEqual([]);
  });

  it('should parse ANSI color codes into styled spans', () => {
    const raw = '\x1b[31mError message\x1b[0m and \x1b[32mSuccess message\x1b[0m';
    const res = service.parseToSpans(raw);

    expect(res.length).toBe(3);
    expect(res[0].text).toBe('Error message');
    expect(res[0].classes).toContain('ansi-red');

    expect(res[1].text).toBe(' and ');
    expect(res[1].classes).toEqual([]);

    expect(res[2].text).toBe('Success message');
    expect(res[2].classes).toContain('ansi-green');
  });

  it('should handle bold and background styles', () => {
    const raw = '\x1b[1;33mBold Yellow\x1b[0m';
    const res = service.parseToSpans(raw);

    expect(res.length).toBe(1);
    expect(res[0].text).toBe('Bold Yellow');
    expect(res[0].classes).toContain('ansi-bold');
    expect(res[0].classes).toContain('ansi-yellow');
  });
});
