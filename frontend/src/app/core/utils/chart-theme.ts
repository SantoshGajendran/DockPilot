import { ChartOptions, TooltipItem } from 'chart.js';

export interface ChartThemeTokens {
  bgSurface: string;
  lineSoft: string;
  lineStrong: string;
  text: string;
  textDim: string;
  violetHi: string;
  gold: string;
}

export const DEFAULT_CHART_TOKENS: ChartThemeTokens = {
  bgSurface: 'rgba(17, 17, 26, 0.95)',
  lineSoft: 'rgba(255, 255, 255, 0.05)',
  lineStrong: 'rgba(255, 255, 255, 0.16)',
  text: '#ECEAF4',
  textDim: '#A09EB4',
  violetHi: '#B39DFF',
  gold: '#D4AF37'
};

/**
 * Creates standardized Chart.js options adhering to Flight Deck design tokens:
 * - 1px dim horizontal guides only, zero vertical gridlines
 * - Glass tooltips with monospace numerals
 * - Smooth update interpolation and first-draw easing
 */
export function createChartThemeOptions(customTokens?: Partial<ChartThemeTokens>): ChartOptions<'line'> {
  const tokens = { ...DEFAULT_CHART_TOKENS, ...customTokens };

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 420,
      easing: 'easeOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: tokens.textDim,
          font: {
            family: "'JetBrains Mono', monospace",
            size: 11
          }
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: tokens.lineSoft,
          lineWidth: 1
        },
        ticks: {
          color: tokens.textDim,
          font: {
            family: "'JetBrains Mono', monospace",
            size: 11
          }
        },
        border: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: tokens.text,
          font: {
            family: "'Space Grotesk', sans-serif",
            size: 12
          },
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: tokens.bgSurface,
        titleColor: tokens.text,
        bodyColor: tokens.text,
        borderColor: tokens.lineStrong,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        titleFont: {
          family: "'Space Grotesk', sans-serif",
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 12
        },
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y !== null ? context.parsed.y : '';
            return ` ${label}: ${value}`;
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        borderColor: tokens.violetHi,
        tension: 0.35
      },
      point: {
        radius: 0,
        hoverRadius: 5,
        hoverBorderWidth: 2,
        hoverBorderColor: tokens.gold
      }
    }
  };
}

/**
 * Generates vertical area gradient under line series fading to transparent.
 */
export function createLineGradient(
  ctx: CanvasRenderingContext2D,
  areaHeight = 200,
  topColor = 'rgba(179, 157, 255, 0.28)',
  bottomColor = 'rgba(179, 157, 255, 0.0)'
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, areaHeight);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}
