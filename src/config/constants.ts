export const SERVER_CONFIG = {
  PORT: 3000,
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_MIMETYPES: ['audio/mpeg', 'audio/mp3'],
} as const;

export const MP3_CONSTANTS = {
  FRAME_SYNC_BYTE1: 0xff,
  FRAME_SYNC_BYTE2_MASK: 0xe0,
  FRAME_SIZE_COEFFICIENT: 144,
  BITRATE_MULTIPLIER: 1000,
  MIN_HEADER_SIZE: 4,
} as const;
