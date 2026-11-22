export const TERMINAL_CONFIG = {
  defaultShell: '/bin/sh',
  allowedShells: ['/bin/sh', '/bin/bash'],
  fontSize: 14,
  fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
  cursorBlink: true,
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selectionBackground: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
  },
} as const;

export const TERMINAL_ENDPOINTS = {
  status: (containerId: string) => `/api/v1/containers/${containerId}/terminal/status`,
  sessions: (containerId: string) => `/api/v1/containers/${containerId}/terminal/sessions`,
  execWs: (containerId: string, token: string, shell: string) => {
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${loc.host}/api/v1/containers/${containerId}/exec?token=${encodeURIComponent(token)}&shell=${encodeURIComponent(shell)}`;
  },
};
