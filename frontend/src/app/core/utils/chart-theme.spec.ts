import { createChartThemeOptions, createLineGradient, DEFAULT_CHART_TOKENS } from './chart-theme';

describe('ChartTheme', () => {
  it('should generate theme options with hidden vertical gridlines', () => {
    const options = createChartThemeOptions();
    expect(options.responsive).toBe(true);
    expect(options.scales?.x?.grid?.display).toBe(false);
  });

  it('should configure 1px horizontal guides using token soft border', () => {
    const options = createChartThemeOptions();
    expect(options.scales?.y?.grid?.color).toBe(DEFAULT_CHART_TOKENS.lineSoft);
    expect(options.scales?.y?.grid?.lineWidth).toBe(1);
  });

  it('should use JetBrains Mono for scale ticks and Space Grotesk for legend', () => {
    const options = createChartThemeOptions();
    const xFont = options.scales?.x?.ticks?.font as { family?: string };
    const legendFont = options.plugins?.legend?.labels?.font as { family?: string };

    expect(xFont?.family).toContain('JetBrains Mono');
    expect(legendFont?.family).toContain('Space Grotesk');
  });

  it('should configure 2px violet line with gold hover point', () => {
    const options = createChartThemeOptions();
    expect(options.elements?.line?.borderColor).toBe(DEFAULT_CHART_TOKENS.violetHi);
    expect(options.elements?.line?.borderWidth).toBe(2);
    expect(options.elements?.point?.hoverBorderColor).toBe(DEFAULT_CHART_TOKENS.gold);
  });

  it('should create linear gradient for canvas context', () => {
    const mockCtx = {
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn()
      })
    } as unknown as CanvasRenderingContext2D;

    const grad = createLineGradient(mockCtx, 150);
    expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 150);
    expect(grad).toBeDefined();
  });
});
