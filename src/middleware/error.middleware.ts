import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Mp3ParserError, ErrorResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File is too large' } as ErrorResponse);
      return;
    }
    res.status(400).json({ error: err.message } as ErrorResponse);
    return;
  }

  if (err instanceof Mp3ParserError) {
    res.status(400).json({ error: err.message } as ErrorResponse);
    return;
  }

  if (err) {
    res.status(400).json({ error: err.message } as ErrorResponse);
    return;
  }

  next();
};
