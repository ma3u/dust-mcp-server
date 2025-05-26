import logger, { LogLevel, Logger } from '../utils/logger.js';

// Example of using the default logger
function demonstrateDefaultLogger() {
  logger.error('This is an error message');
  logger.warn('This is a warning message');
  logger.info('This is an info message');
  logger.debug('This is a debug message'); // Won't show with default INFO level
  logger.trace('This is a trace message'); // Won't show with default INFO level

  // Log with metadata
  logger.info('User authenticated', {
    userId: '123',
    timestamp: new Date().toISOString(),
  });

  // Change log level dynamically
  logger.setLevel(LogLevel.DEBUG);
  logger.debug('This debug message will now be visible');

  // Reset to default
  logger.setLevel(LogLevel.INFO);
}

// Example of creating a custom logger for a specific component
function demonstrateCustomLogger() {
  // Create a custom logger for a specific component
  const dbLogger = new Logger({
    level: LogLevel.DEBUG,
    logFilePrefix: 'database',
    logToConsole: true,
  });

  dbLogger.info('Database connection established');
  dbLogger.debug('Query executed', {
    query: 'SELECT * FROM users',
    duration: '5ms',
  });

  // Clean up resources when done
  dbLogger.close();
}

// Example of handling sensitive information
function demonstrateSensitiveLogging() {
  // Don't log sensitive information directly
  const sensitiveData = {
    username: 'user@example.com',
    password: 'secret123', // Never log passwords!
    apiKey: 'sk_test_123456789',
  };

  // BAD: Don't do this
  // logger.info('User credentials', sensitiveData);

  // GOOD: Redact sensitive information
  const redactedData = {
    username: sensitiveData.username,
    password: '********',
    apiKey: 'sk_test_*******',
  };

  logger.info('User credentials', redactedData);
}

// Example of error handling with logger
async function demonstrateErrorHandling() {
  try {
    // Simulate an error
    throw new Error('Something went wrong');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Operation failed', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Unknown error occurred', { error });
    }
  }
}

// Run the examples
async function runExamples() {
  logger.info('Starting logger examples');

  demonstrateDefaultLogger();
  demonstrateCustomLogger();
  demonstrateSensitiveLogging();
  await demonstrateErrorHandling();

  logger.info('Logger examples completed');
}

// Export the examples
export { runExamples };

// If this file is run directly
if (process.argv[1].endsWith('logger-example.js')) {
  runExamples().catch((err) => {
    logger.error('Failed to run examples', err);
    process.exit(1);
  });
}
