import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 ATELIER API listening on http://localhost:${PORT}`);
  });
}

start();