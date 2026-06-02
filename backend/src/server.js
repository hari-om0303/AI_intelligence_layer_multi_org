require('dotenv').config();
const loadSecrets = require('./config/secrets');
const app = require('./app');
const connectDB = require('./config/db');

const http = require('http');
const socket = require('./config/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Hydrate process.env with GCP Secret Manager secrets in production
  await loadSecrets();

  await connectDB();
  
  const server = http.createServer(app);
  socket.init(server);
  
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();
