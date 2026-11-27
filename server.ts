import 'dotenv/config';
import { createApp } from './server/app.ts';

const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT || DEFAULT_PORT);

/**
 * Boots the VayuCare Express server on `0.0.0.0:PORT`.
 */
async function startServer(): Promise<void> {
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VayuCare server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
