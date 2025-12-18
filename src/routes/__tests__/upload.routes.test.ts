import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import uploadRoutes from '../upload.routes';
import { errorHandler } from '../../middleware/error.middleware';

const app = express();
app.use(uploadRoutes);
app.use(errorHandler);

describe('Upload Routes', () => {
  const createValidMp3Buffer = (): Buffer => {
    // Create a minimal valid MP3 frame
    const frameSize = 417; // For 128kbps, 44.1kHz
    const buffer = Buffer.alloc(frameSize);

    // Frame sync (11 bits): 0xFFE
    buffer[0] = 0xff;
    buffer[1] = 0xe0;

    // MPEG1 Layer III
    buffer[1] |= 0x1a;

    // Bitrate: 128kbps (index 9)
    buffer[2] = 0x90;

    // Sample rate: 44.1kHz (index 0)
    buffer[2] |= 0x00;

    return buffer;
  };

  describe('POST /file-upload', () => {
    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app).post('/file-upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if non-MP3 file is uploaded', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', Buffer.from('not an mp3'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should successfully process valid MP3 file', async () => {
      const mp3Buffer = createValidMp3Buffer();

      const response = await request(app)
        .post('/file-upload')
        .attach('file', mp3Buffer, 'test.mp3')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('frameCount');
      expect(typeof response.body.frameCount).toBe('number');
      expect(response.body.frameCount).toBeGreaterThan(0);
    });

    it('should reject file that is too large', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(app)
        .post('/file-upload')
        .attach('file', largeBuffer, 'large.mp3')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty MP3 file', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app)
        .post('/file-upload')
        .attach('file', emptyBuffer, 'empty.mp3')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle multiple valid frames correctly', async () => {
      const frameSize = 417;
      const numFrames = 10;
      const buffer = Buffer.alloc(frameSize * numFrames);

      // Create multiple valid frames
      for (let i = 0; i < numFrames; i++) {
        const offset = i * frameSize;
        buffer[offset] = 0xff;
        buffer[offset + 1] = 0xfa;
        buffer[offset + 2] = 0x90;
      }

      const response = await request(app)
        .post('/file-upload')
        .attach('file', buffer, 'multi-frame.mp3')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('frameCount');
      expect(response.body.frameCount).toBe(numFrames);
    });
  });
});
