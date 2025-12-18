import * as fs from 'fs';
import { InvalidMp3Error } from '../types';
import { MP3_CONSTANTS } from '../config/constants';

export class StreamingMp3Parser {
  private filePath: string;
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks
  private static readonly BITRATE_TABLE = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
  ];
  private static readonly SAMPLE_RATE_TABLE = [44100, 48000, 32000, 0];

  constructor(filePath: string) {
    if (!filePath) {
      throw new InvalidMp3Error('File path is required');
    }

    if (!fs.existsSync(filePath)) {
      throw new InvalidMp3Error('File does not exist');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new InvalidMp3Error('File is empty');
    }

    this.filePath = filePath;
  }

  public async getFrameCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filePath, {
        highWaterMark: StreamingMp3Parser.CHUNK_SIZE,
      });

      let frameCount = 0;
      let buffer = Buffer.alloc(0);
      let offset = 0;

      stream.on('data', (chunk: Buffer) => {
        // Append new chunk to existing buffer
        buffer = Buffer.concat([buffer, chunk]);

        // Process frames in the buffer
        while (offset < buffer.length - MP3_CONSTANTS.MIN_HEADER_SIZE) {
          const byte1 = buffer[offset];
          const byte2 = buffer[offset + 1];

          if (
            byte1 !== undefined &&
            byte2 !== undefined &&
            byte1 === MP3_CONSTANTS.FRAME_SYNC_BYTE1 &&
            (byte2 & MP3_CONSTANTS.FRAME_SYNC_BYTE2_MASK) ===
              MP3_CONSTANTS.FRAME_SYNC_BYTE2_MASK
          ) {
            const frameSize = this.getFrameSize(buffer, offset);

            if (frameSize > 0) {
              if (offset + frameSize <= buffer.length) {
                frameCount++;
                offset += frameSize;
              } else {
                // Frame extends beyond current buffer, wait for more data
                break;
              }
            } else {
              offset++;
            }
          } else {
            offset++;
          }
        }

        // Keep remaining unprocessed data
        if (offset > 0) {
          buffer = buffer.subarray(offset);
          offset = 0;
        }
      });

      stream.on('end', () => {
        if (frameCount === 0) {
          reject(new InvalidMp3Error('No valid MP3 frames found'));
        } else {
          resolve(frameCount);
        }
      });

      stream.on('error', (error) => {
        reject(new InvalidMp3Error(`Error reading file: ${error.message}`));
      });
    });
  }

  private getFrameSize(buffer: Buffer, offset: number): number {
    if (offset + MP3_CONSTANTS.MIN_HEADER_SIZE > buffer.length) {
      return 0;
    }

    const header = buffer.readUInt32BE(offset);

    const bitrateIndex = (header >> 12) & 0x0f;
    const bitrate = StreamingMp3Parser.BITRATE_TABLE[bitrateIndex];

    const sampleRateIndex = (header >> 10) & 0x03;
    const sampleRate = StreamingMp3Parser.SAMPLE_RATE_TABLE[sampleRateIndex];

    const padding = (header >> 9) & 0x01;

    if (!bitrate || bitrate === 0 || !sampleRate || sampleRate === 0) {
      return 0;
    }

    const frameSize =
      Math.floor(
        (MP3_CONSTANTS.FRAME_SIZE_COEFFICIENT * bitrate * MP3_CONSTANTS.BITRATE_MULTIPLIER) /
          sampleRate
      ) + padding;

    return frameSize;
  }
}
