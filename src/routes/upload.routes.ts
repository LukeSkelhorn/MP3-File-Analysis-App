import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import { upload } from '../middleware/upload.middleware';
import { StreamingMp3Parser } from '../core/streaming-mp3-parser';
import { UploadSuccessResponse, ErrorResponse } from '../types';

const router = Router();

router.post(
  '/file-upload',
  upload.single('file'),
  async (req: Request, res: Response<UploadSuccessResponse | ErrorResponse>, next: NextFunction) => {
    let filePath: string | undefined;

    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      filePath = req.file.path;
      const parser = new StreamingMp3Parser(filePath);
      const frameCount = await parser.getFrameCount();

      res.status(200).json({
        frameCount,
      });
    } catch (error) {
      next(error);
    } finally {
      // Clean up the uploaded file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
);

export default router;
