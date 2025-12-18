import { Express } from 'express';
import { InvalidMp3Error } from '../types';
import { MP3_CONSTANTS } from '../config/constants';

export class Mp3Parser {
  private buffer: Buffer;

  // Bitrate table for MPEG1 Layer 3 (in kbps)
  private static readonly BITRATE_TABLE = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0
  ];

  // Sample rate table for MPEG1 (in Hz)
  private static readonly SAMPLE_RATE_TABLE = [44100, 48000, 32000, 0];

  constructor(file: Express.Multer.File) {
    if (!file.buffer) {
      throw new InvalidMp3Error('File buffer is missing');
    }

    if (file.buffer.length === 0) {
      throw new InvalidMp3Error('File is empty');
    }

    this.buffer = file.buffer;
  }

  public getFrameCount(): number {
    let frameCount = 0;
    let offset = 0;

    while (offset < this.buffer.length - MP3_CONSTANTS.MIN_HEADER_SIZE) {
      const byte1 = this.buffer[offset];
      const byte2 = this.buffer[offset + 1];

      // Check for MP3 frame sync (11 bits set to 1)
      if (
        byte1 !== undefined &&
        byte2 !== undefined &&
        byte1 === MP3_CONSTANTS.FRAME_SYNC_BYTE1 &&
        (byte2 & MP3_CONSTANTS.FRAME_SYNC_BYTE2_MASK) === MP3_CONSTANTS.FRAME_SYNC_BYTE2_MASK
      ) {
        const frameSize = this.getFrameSize(offset);

        if (frameSize > 0) {
          frameCount++;
          offset += frameSize;
        } else {
          offset++;
        }
      } else {
        offset++;
      }
    }

    if (frameCount === 0) {
      throw new InvalidMp3Error('No valid MP3 frames found');
    }

    return frameCount;
  }

  private getFrameSize(offset: number): number {
    if (offset + MP3_CONSTANTS.MIN_HEADER_SIZE > this.buffer.length) {
      return 0;
    }

    const header = this.buffer.readUInt32BE(offset);

    // Extract bitrate index (bits 12-15)
    const bitrateIndex = (header >> 12) & 0x0f;
    const bitrate = Mp3Parser.BITRATE_TABLE[bitrateIndex];

    // Extract sample rate index (bits 10-11)
    const sampleRateIndex = (header >> 10) & 0x03;
    const sampleRate = Mp3Parser.SAMPLE_RATE_TABLE[sampleRateIndex];

    // Extract padding bit (bit 9)
    const padding = (header >> 9) & 0x01;

    // Validate values
    if (!bitrate || bitrate === 0 || !sampleRate || sampleRate === 0) {
      return 0;
    }

    // Calculate frame size for MPEG1 Layer 3
    // Formula: frameSize = (144 * bitrate * 1000 / sampleRate) + padding
    const frameSize = Math.floor(
      (MP3_CONSTANTS.FRAME_SIZE_COEFFICIENT * bitrate * MP3_CONSTANTS.BITRATE_MULTIPLIER) / sampleRate
    ) + padding;

    return frameSize;
  }
}
