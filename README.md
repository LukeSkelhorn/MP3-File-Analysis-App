# MP3 File Analysis App

A scalable Node.js API for analyzing MP3 files and determining the total number of audio frames.

## Features

- **Accurate Frame Counting**: Parses MP3 files to accurately count audio frames
- **Scalable Architecture**: Uses streaming and disk storage to handle large files efficiently
- **Type-Safe**: Built with TypeScript for enhanced code quality and maintainability
- **Well-Tested**: Comprehensive test suite with Jest
- **Code Quality**: Enforced with ESLint and Prettier
- **Error Handling**: Robust error handling with custom error types

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

## Installation

1. Clone the repository:
```bash
git clone https://github.com/LukeSkelhorn/MP3-File-Analysis-App.git
cd MP3-File-Analysis-App
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Development Mode

Run the server in development mode with hot reloading:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Mode

Build and run in production:

```bash
npm run build
npm start
```

## API Documentation

### Health Check

Check if the server is running:

```http
GET /health
```

**Response:**
```
OK
```

### Upload MP3 File

Upload an MP3 file and get the frame count:

```http
POST /file-upload
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (required): MP3 file (max 10MB)

**Success Response (200):**
```json
{
  "frameCount": 8640
}
```

**Error Responses:**

- `400 Bad Request` - No file uploaded
```json
{
  "error": "No file uploaded"
}
```

- `400 Bad Request` - Invalid file type
```json
{
  "error": "Only MP3 files are allowed"
}
```

- `400 Bad Request` - File too large
```json
{
  "error": "File is too large"
}
```

- `400 Bad Request` - Invalid MP3 file
```json
{
  "error": "No valid MP3 frames found"
}
```

### Example Usage

#### Using cURL:
```bash
curl -X POST -F "file=@path/to/your/song.mp3" http://localhost:3000/file-upload
```

#### Using JavaScript (fetch):
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/file-upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('Frame count:', data.frameCount);
```

## Project Structure

```
src/
├── config/
│   └── constants.ts          # Configuration constants
├── core/
│   ├── mp3-parser.ts          # In-memory MP3 parser
│   ├── streaming-mp3-parser.ts # Streaming MP3 parser for large files
│   └── __tests__/
│       └── mp3-parser.test.ts
├── middleware/
│   ├── error.middleware.ts    # Error handling middleware
│   └── upload.middleware.ts   # File upload configuration
├── routes/
│   ├── upload.routes.ts       # Upload route handlers
│   └── __tests__/
│       └── upload.routes.test.ts
├── types/
│   └── index.ts               # TypeScript types and custom errors
└── index.ts                   # Application entry point
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Running Tests

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Code Quality

Lint your code:
```bash
npm run lint
```

Format your code:
```bash
npm run format
```

Type check:
```bash
npm run typecheck
```

## Technical Details

### MP3 Frame Parsing

The application uses two MP3 parser implementations:

1. **Mp3Parser** (In-memory): Used for testing and small files
2. **StreamingMp3Parser**: Used in production for scalability

The streaming parser:
- Reads files in 64KB chunks
- Processes frames incrementally
- Supports MPEG1 Layer 3 format
- Handles variable bitrate and sample rate
- Cleans up temporary files after processing

### Frame Size Calculation

Frame size is calculated using the formula:
```
frameSize = (144 * bitrate * 1000 / sampleRate) + padding
```

Where:
- `bitrate` is extracted from the MP3 frame header (in kbps)
- `sampleRate` is extracted from the frame header (in Hz)
- `padding` is a single bit indicating if the frame has an extra byte

### Scalability

The application is designed to handle large MP3 files efficiently:

- **Disk Storage**: Files are stored temporarily on disk, not in memory
- **Streaming Processing**: Files are processed in chunks to minimize memory usage
- **Automatic Cleanup**: Temporary files are deleted after processing
- **File Size Limits**: Configurable maximum file size (default: 10MB)

## Configuration

Configuration constants can be modified in `src/config/constants.ts`:

```typescript
export const SERVER_CONFIG = {
  PORT: 3000,
};

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIMETYPES: ['audio/mpeg', 'audio/mp3'],
};
```

## Error Handling

The application includes custom error types for better error handling:

- `Mp3ParserError`: Base error class for MP3 parsing errors
- `InvalidMp3Error`: Thrown when the file is not a valid MP3

All errors are handled by the global error middleware and return appropriate HTTP status codes.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Author

Luke Skelhorn

## Repository

https://github.com/LukeSkelhorn/MP3-File-Analysis-App