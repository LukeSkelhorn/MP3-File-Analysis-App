export class Mp3ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Mp3ParserError';
  }
}

export class InvalidMp3Error extends Mp3ParserError {
  constructor(message: string = 'Invalid MP3 file') {
    super(message);
    this.name = 'InvalidMp3Error';
  }
}

export interface UploadSuccessResponse {
  frameCount: number;
}

export interface ErrorResponse {
  error: string;
}
