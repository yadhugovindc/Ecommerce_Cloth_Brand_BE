import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { assertStripeConfig } from './config/stripe';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  assertStripeConfig();
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 ATELIER API listening on http://localhost:${PORT}`);
  });
}

start();