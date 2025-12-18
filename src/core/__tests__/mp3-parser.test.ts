import { describe, it, expect } from '@jest/globals';
import { Mp3Parser } from '../mp3-parser';
import { InvalidMp3Error } from '../../types';
import { Express } from 'express';

describe('Mp3Parser', () => {
  const createMockFile = (buffer: Buffer): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    buffer,
    size: buffer.length,
    stream: {} as any,
    destination: '',
    filename: '',
    path: '',
  });

  const createValidMp3Frame = (
    bitrate: number = 128,
    sampleRate: number = 44100,
    padding: number = 0
  ): Buffer => {
    const buffer = Buffer.alloc(4);

    // Frame sync (11 bits): 0xFFE
    buffer[0] = 0xff;
    buffer[1] = 0xe0;

    // MPEG version (2 bits): MPEG1 = 11
    buffer[1] |= 0x18;

    // Layer (2 bits): Layer III = 01
    buffer[1] |= 0x02;

    // Bitrate index (4 bits) - position in header[2] bits 4-7
    const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const bitrateIndex = bitrateTable.indexOf(bitrate);
    buffer[2] = (bitrateIndex << 4) & 0xf0;

    // Sample rate index (2 bits) - position in header[2] bits 2-3
    const sampleRateTable = [44100, 48000, 32000, 0];
    const sampleRateIndex = sampleRateTable.indexOf(sampleRate);
    buffer[2] |= (sampleRateIndex << 2) & 0x0c;

    // Padding bit (1 bit) - position in header[2] bit 1
    buffer[2] |= (padding << 1) & 0x02;

    return buffer;
  };

  describe('constructor', () => {
    it('should throw InvalidMp3Error if buffer is missing', () => {
      const mockFile = createMockFile(Buffer.alloc(0));
      (mockFile as any).buffer = undefined;

      expect(() => new Mp3Parser(mockFile)).toThrow(InvalidMp3Error);
      expect(() => new Mp3Parser(mockFile)).toThrow('File buffer is missing');
    });

    it('should throw InvalidMp3Error if buffer is empty', () => {
      const mockFile = createMockFile(Buffer.alloc(0));

      expect(() => new Mp3Parser(mockFile)).toThrow(InvalidMp3Error);
      expect(() => new Mp3Parser(mockFile)).toThrow('File is empty');
    });

    it('should create parser instance with valid buffer', () => {
      const mockFile = createMockFile(Buffer.from([1, 2, 3]));
      const parser = new Mp3Parser(mockFile);

      expect(parser).toBeInstanceOf(Mp3Parser);
    });
  });

  describe('getFrameCount', () => {
    it('should throw InvalidMp3Error if no valid frames are found', () => {
      const mockFile = createMockFile(Buffer.from([0x00, 0x00, 0x00, 0x00]));
      const parser = new Mp3Parser(mockFile);

      expect(() => parser.getFrameCount()).toThrow(InvalidMp3Error);
      expect(() => parser.getFrameCount()).toThrow('No valid MP3 frames found');
    });

    it('should count a single valid MP3 frame', () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);
      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const mockFile = createMockFile(frameData);
      const parser = new Mp3Parser(mockFile);

      expect(parser.getFrameCount()).toBe(1);
    });

    it('should count multiple valid MP3 frames', () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);

      // Create 3 frames
      const buffer = Buffer.alloc(frameSize * 3);
      for (let i = 0; i < 3; i++) {
        frameHeader.copy(buffer, i * frameSize);
      }

      const mockFile = createMockFile(buffer);
      const parser = new Mp3Parser(mockFile);

      expect(parser.getFrameCount()).toBe(3);
    });

    it('should handle frames with padding', () => {
      const frameHeader = createValidMp3Frame(128, 44100, 1);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100) + 1; // +1 for padding

      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const mockFile = createMockFile(frameData);
      const parser = new Mp3Parser(mockFile);

      expect(parser.getFrameCount()).toBe(1);
    });

    it('should skip invalid data before finding valid frames', () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);

      // Add some junk data before the frame
      const junkData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const buffer = Buffer.concat([junkData, frameData]);
      const mockFile = createMockFile(buffer);
      const parser = new Mp3Parser(mockFile);

      expect(parser.getFrameCount()).toBe(1);
    });

    it('should handle different bitrates correctly', () => {
      const bitrates = [128, 192, 320];
      const results = bitrates.map((bitrate) => {
        const frameHeader = createValidMp3Frame(bitrate, 44100, 0);
        const frameSize = Math.floor((144 * bitrate * 1000) / 44100);

        const frameData = Buffer.alloc(frameSize);
        frameHeader.copy(frameData);

        const mockFile = createMockFile(frameData);
        const parser = new Mp3Parser(mockFile);

        return parser.getFrameCount();
      });

      expect(results).toEqual([1, 1, 1]);
    });

    it('should handle different sample rates correctly', () => {
      const sampleRates = [44100, 48000, 32000];
      const results = sampleRates.map((sampleRate) => {
        const frameHeader = createValidMp3Frame(128, sampleRate, 0);
        const frameSize = Math.floor((144 * 128 * 1000) / sampleRate);

        const frameData = Buffer.alloc(frameSize);
        frameHeader.copy(frameData);

        const mockFile = createMockFile(frameData);
        const parser = new Mp3Parser(mockFile);

        return parser.getFrameCount();
      });

      expect(results).toEqual([1, 1, 1]);
    });
  });
});
