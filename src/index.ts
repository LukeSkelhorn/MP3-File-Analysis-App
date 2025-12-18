import express from 'express';
import uploadRoutes from './routes/upload.routes';
import { errorHandler } from './middleware/error.middleware';
import { SERVER_CONFIG } from './config/constants';

const app = express();

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use(uploadRoutes);
app.use(errorHandler);

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server is running on http://localhost:${SERVER_CONFIG.PORT}`);
}); 
