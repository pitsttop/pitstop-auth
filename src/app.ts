// src/app.ts

import express from 'express';
import authRoutes from './routes/auth.routes';
import { authorize } from './middlewares/auth.middlewares';
import { UserRole } from '@prisma/client';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

// Rota protegida usada apenas em testes de integração
if (process.env.NODE_ENV === 'test') {
	app.get(
		'/protected',
		authorize([UserRole.CLIENT]),
		(req, res) => {
			return res.json({ ok: true, user: (req as any).user });
		}
	);
}

export { app }; // Exporta a aplicação para os testes e para o servidor