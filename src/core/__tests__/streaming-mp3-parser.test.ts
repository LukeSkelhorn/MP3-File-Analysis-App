import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { StreamingMp3Parser } from '../streaming-mp3-parser';
import { InvalidMp3Error } from '../../types';

describe('StreamingMp3Parser', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  let testFilePath: string;

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (testFilePath && fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
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

    // Bitrate index (4 bits)
    const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const bitrateIndex = bitrateTable.indexOf(bitrate);
    buffer[2] = (bitrateIndex << 4) & 0xf0;

    // Sample rate index (2 bits)
    const sampleRateTable = [44100, 48000, 32000, 0];
    const sampleRateIndex = sampleRateTable.indexOf(sampleRate);
    buffer[2] |= (sampleRateIndex << 2) & 0x0c;

    // Padding bit (1 bit)
    buffer[2] |= (padding << 1) & 0x02;

    return buffer;
  };

  const createTestFile = (content: Buffer): string => {
    testFilePath = path.join(testDir, `test-${Date.now()}.mp3`);
    fs.writeFileSync(testFilePath, content);
    return testFilePath;
  };

  describe('constructor', () => {
    it('should throw InvalidMp3Error if file path is not provided', () => {
      expect(() => new StreamingMp3Parser('')).toThrow(InvalidMp3Error);
      expect(() => new StreamingMp3Parser('')).toThrow('File path is required');
    });

    it('should throw InvalidMp3Error if file does not exist', () => {
      const nonExistentPath = path.join(testDir, 'non-existent.mp3');

      expect(() => new StreamingMp3Parser(nonExistentPath)).toThrow(InvalidMp3Error);
      expect(() => new StreamingMp3Parser(nonExistentPath)).toThrow('File does not exist');
    });

    it('should throw InvalidMp3Error if file is empty', () => {
      const emptyFile = createTestFile(Buffer.alloc(0));

      expect(() => new StreamingMp3Parser(emptyFile)).toThrow(InvalidMp3Error);
      expect(() => new StreamingMp3Parser(emptyFile)).toThrow('File is empty');
    });

    it('should create parser instance with valid file', () => {
      const file = createTestFile(Buffer.from([1, 2, 3]));
      const parser = new StreamingMp3Parser(file);

      expect(parser).toBeInstanceOf(StreamingMp3Parser);
    });
  });

  describe('getFrameCount', () => {
    it('should reject if no valid frames are found', async () => {
      const file = createTestFile(Buffer.from([0x00, 0x00, 0x00, 0x00]));
      const parser = new StreamingMp3Parser(file);

      await expect(parser.getFrameCount()).rejects.toThrow(InvalidMp3Error);
      await expect(parser.getFrameCount()).rejects.toThrow('No valid MP3 frames found');
    });

    it('should count a single valid MP3 frame', async () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);
      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const file = createTestFile(frameData);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(1);
    });

    it('should count multiple valid MP3 frames', async () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);

      // Create 5 frames
      const buffer = Buffer.alloc(frameSize * 5);
      for (let i = 0; i < 5; i++) {
        frameHeader.copy(buffer, i * frameSize);
      }

      const file = createTestFile(buffer);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(5);
    });

    it('should handle frames with padding', async () => {
      const frameHeader = createValidMp3Frame(128, 44100, 1);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100) + 1; // +1 for padding

      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const file = createTestFile(frameData);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(1);
    });

    it('should skip invalid data before finding valid frames', async () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);

      // Add some junk data before the frame
      const junkData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
      const frameData = Buffer.alloc(frameSize);
      frameHeader.copy(frameData);

      const buffer = Buffer.concat([junkData, frameData]);
      const file = createTestFile(buffer);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(1);
    });

    it('should handle different bitrates correctly', async () => {
      const bitrates = [128, 192, 320];

      for (const bitrate of bitrates) {
        const frameHeader = createValidMp3Frame(bitrate, 44100, 0);
        const frameSize = Math.floor((144 * bitrate * 1000) / 44100);

        const frameData = Buffer.alloc(frameSize);
        frameHeader.copy(frameData);

        const file = createTestFile(frameData);
        const parser = new StreamingMp3Parser(file);

        const count = await parser.getFrameCount();
        expect(count).toBe(1);

        // Clean up after each iteration
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
    });

    it('should handle different sample rates correctly', async () => {
      const sampleRates = [44100, 48000, 32000];

      for (const sampleRate of sampleRates) {
        const frameHeader = createValidMp3Frame(128, sampleRate, 0);
        const frameSize = Math.floor((144 * 128 * 1000) / sampleRate);

        const frameData = Buffer.alloc(frameSize);
        frameHeader.copy(frameData);

        const file = createTestFile(frameData);
        const parser = new StreamingMp3Parser(file);

        const count = await parser.getFrameCount();
        expect(count).toBe(1);

        // Clean up after each iteration
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
    });

    it('should handle large files with many frames', async () => {
      const frameHeader = createValidMp3Frame(128, 44100, 0);
      const frameSize = Math.floor((144 * 128 * 1000) / 44100);
      const numFrames = 100;

      // Create a file with 100 frames
      const buffer = Buffer.alloc(frameSize * numFrames);
      for (let i = 0; i < numFrames; i++) {
        frameHeader.copy(buffer, i * frameSize);
      }

      const file = createTestFile(buffer);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(numFrames);
    });

    it('should reject on file read error', async () => {
      const file = createTestFile(Buffer.from([1, 2, 3]));
      const parser = new StreamingMp3Parser(file);

      // Delete the file to cause a read error
      fs.unlinkSync(file);

      await expect(parser.getFrameCount()).rejects.toThrow(InvalidMp3Error);
      await expect(parser.getFrameCount()).rejects.toThrow(/Error reading file/);
    });

    it('should handle frames spanning across stream chunks', async () => {
      // Create a file larger than the chunk size (64KB) to test chunk boundaries
      const frameHeader = createValidMp3Frame(320, 44100, 0);
      const frameSize = Math.floor((144 * 320 * 1000) / 44100);
      const numFrames = 200; // Should span multiple 64KB chunks

      const buffer = Buffer.alloc(frameSize * numFrames);
      for (let i = 0; i < numFrames; i++) {
        frameHeader.copy(buffer, i * frameSize);
      }

      const file = createTestFile(buffer);
      const parser = new StreamingMp3Parser(file);

      const count = await parser.getFrameCount();
      expect(count).toBe(numFrames);
    });
  });

  // Clean up test directory after all tests
  afterAll(() => {
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });
});
