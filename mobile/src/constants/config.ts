const rawBase = process.env.EXPO_PUBLIC_API_BASE_URL || '';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(rawBase);
// Backend mounts routes at /api/v1
export const API_PREFIX = '/api/v1';
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

export const REQUEST_TIMEOUT_MS = 15000;

export const API_CONFIG_HELP = {
  androidEmulator: 'http://10.0.2.2:4000 (maps emulator to host machine localhost)',
  iosSimulator: 'http://localhost:4000',
  physicalDevice: 'http://<YOUR_COMPUTER_LAN_IP>:4000 (same Wi-Fi as development computer)',
  note: 'localhost on a phone/emulator refers to that device itself, not your development computer.',
};
