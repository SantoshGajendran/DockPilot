export const TERMINAL_CONFIG = {
  defaultShell: '/bin/sh',
  allowedShells: ['/bin/sh', '/bin/bash'],
  fontSize: 14,
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  cursorBlink: true,
  theme: {
    background: '#060609',
    foreground: '#ECEAF4',
    cursor: '#D4AF37',
    selectionBackground: '#4B2FA8',
    black: '#060609',
    red: '#F43F5E',
    green: '#34D399',
    yellow: '#F59E0B',
    blue: '#60A5FA',
    magenta: '#8B5CF6',
    cyan: '#B39DFF',
    white: '#ECEAF4',
    brightBlack: '#6B6980',
    brightRed: '#F43F5E',
    brightGreen: '#34D399',
    brightYellow: '#F2D27A',
    brightBlue: '#60A5FA',
    brightMagenta: '#B39DFF',
    brightCyan: '#B39DFF',
    brightWhite: '#FFFFFF',
  },
} as const;

export const TERMINAL_ENDPOINTS = {
  status: (containerId: string) => `api/v1/containers/${containerId}/terminal/status`,
  sessions: (containerId: string) => `api/v1/containers/${containerId}/terminal/sessions`,
  execWs: (containerId: string, token: string, shell: string) => {
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseElem = document.querySelector('base');
    const baseHref = baseElem?.getAttribute('href') || '/';
    const prefix = baseHref.startsWith('/') ? baseHref : `/${baseHref}`;
    const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    return `${proto}//${loc.host}${cleanPrefix}api/v1/containers/${containerId}/exec?token=${encodeURIComponent(token)}&shell=${encodeURIComponent(shell)}`;
  },
};
