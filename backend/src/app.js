const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SaaS Platform API is running' });
});

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const projectRoutes = require('./modules/project/project.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const organizationRoutes = require('./modules/organization/organization.routes');
const userRoutes = require('./modules/user/user.routes');
const systemRoutes = require('./modules/system/system.routes');
const intelligenceRoutes = require('./modules/intelligence/intelligence.routes');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
