export const RESOURCE_TABS = [
  { id: 'images', label: 'Images', icon: 'layers' },
  { id: 'volumes', label: 'Volumes', icon: 'storage' },
  { id: 'networks', label: 'Networks', icon: 'hub' },
] as const;

export type ResourceTabType = 'images' | 'volumes' | 'networks';

export const RESOURCE_STATUS_CONFIG = {
  inUse: {
    label: 'In Use',
    color: 'accent',
    icon: 'check_circle',
  },
  unused: {
    label: 'Unused',
    color: 'warn',
    icon: 'warning',
  },
  protected: {
    label: 'Protected',
    color: 'primary',
    icon: 'shield',
  },
  builtIn: {
    label: 'Built-in',
    color: 'default',
    icon: 'lock',
  },
  dangling: {
    label: 'Dangling',
    color: 'warn',
    icon: 'link_off',
  },
} as const;

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1));
  return `${val} ${sizes[i]}`;
}

