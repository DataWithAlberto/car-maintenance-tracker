import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/environment';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/errorHandler';

import vehicleRoutes from './routes/vehicle.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import expensesRoutes from './routes/expenses.routes';
import documentsRoutes from './routes/documents.routes';
import sharingRoutes from './routes/sharing.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Protected API
app.use('/api/vehicles', authMiddleware, vehicleRoutes);
app.use('/api/maintenance', authMiddleware, maintenanceRoutes);
app.use('/api/expenses', authMiddleware, expensesRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/sharing', authMiddleware, sharingRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[server] http://localhost:${env.port} (${env.nodeEnv})`);
});

export default app;
