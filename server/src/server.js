import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './config/logger.js';

let server;

const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDatabase();

    // 2. Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
      logger.info(`REST API available at: http://localhost:${env.PORT}/api/v1`);
      logger.info(`Health check at: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Disconnect from database
        await disconnectDatabase();

        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    });

    // If server takes longer than 10 seconds to close, force exit
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcefully terminating process.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();

