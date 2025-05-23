import fs from 'node:fs';
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log levels for structured logging
 * @readonly
 * @enum {number}
 */
export enum LogLevel {
  ERROR = 0,  // System is in a critical state
  WARN = 1,   // Unexpected but handled condition
  INFO = 2,   // General operational messages
  DEBUG = 3,  // Debug-level information
  TRACE = 4   // Very detailed debugging
}

// Map log levels to string representations
const LOG_LEVEL_STRINGS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE'
};

/**
 * Logger configuration options
 */
interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to write logs to file */
  logToFile: boolean;
  /** Whether to output logs to console (avoid in MCP environments) */
  logToConsole: boolean;
  /** Directory to store log files */
  logDir: string;
  /** Prefix for log filenames */
  logFilePrefix: string;
  /** Maximum size of a single log file in bytes */
  maxLogFileSizeBytes: number;
  /** Maximum number of log files to keep */
  maxLogFiles: number;
  /** Whether to include timestamps in logs */
  includeTimestamps: boolean;
  /** Whether to include request IDs for correlation */
  includeRequestId: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  logToFile: true,
  // WARNING: NEVER enable logToConsole in MCP STDIO JSON environments!
  // Only set to true for local debugging
  logToConsole: process.env.NODE_ENV !== 'production',
  logDir: path.join(process.cwd(), 'memory-bank/logs'),
  logFilePrefix: 'mcp-server',
  maxLogFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 10,
  includeTimestamps: true,
  includeRequestId: true
};

/**
 * Logger class for structured, MCP-compliant logging
 */
class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private initializing: boolean = false;
  private initPromise: Promise<void> | null = null;
  private requestId: string | null = null;

  /**
   * Create a new Logger instance
   * @param config - Logger configuration (partial, will be merged with defaults)
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Ensure log directory exists if file logging is enabled
    if (this.config.logToFile) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
    
    this.currentLogFile = this.getLogFilePath();
    
    // Initialize request ID for correlation
    this.requestId = this.config.includeRequestId ? uuidv4() : null;
    
    // Log initialization
    if (this.config.logToFile) {
      this.initializeLogger().catch(err => {
        // If we can't initialize the logger, we'll log to stderr as a last resort
        process.stderr.write(`Failed to initialize logger: ${err.message}\n`);
      });
    }
  }

  /**
   * Ensure logger is initialized
   */
  private async ensureInitialized() {
    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }
    if (this.isInitialized) return;
    
    this.initializing = true;
    this.initPromise = this.initializeLogger();
    try {
      await this.initPromise;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Check if logger is fully initialized
   */
  private get isInitialized(): boolean {
    return !this.initializing && this.initPromise !== null;
  }
  
  /**
   * Set request ID for correlation
   */
  public setRequestId(id: string): void {
    this.requestId = id;
  }
  
  /**
   * Get current request ID
   */
  public getRequestId(): string | null {
    return this.requestId;
  }

  private async initializeLogger() {
    try {
      // Ensure log directory exists
      await fsPromises.mkdir(this.config.logDir, { recursive: true });
      
      // Initialize write stream if logging to file
      if (this.config.logToFile) {
        this.openLogStream();
      }
    } catch (error) {
      // Fallback to a directory we can write to
      const fallbackDir = path.join(process.cwd(), 'logs');
      if (this.config.logDir !== fallbackDir) {
        this.config.logDir = fallbackDir;
        this.currentLogFile = this.getLogFilePath();
        await fsPromises.mkdir(fallbackDir, { recursive: true });
        if (this.config.logToFile) {
          this.openLogStream();
        }
      } else {
        // If we're already using the fallback, just disable file logging
        this.config.logToFile = false;
      }
    }
  }

  private openLogStream() {
    if (this.writeStream) {
      this.writeStream.end();
    }
    
    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    this.writeStream.on('error', (err) => {
      // [MCP POLICY] STDIO logging is disabled. Silently fail or handle as needed.
      // Optionally, could buffer errors to memory or ignore.
    });
  }

  private getLogFilePath(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.config.logDir, `${this.config.logFilePrefix}-${dateStr}.log`);
  }

  private async rotateLogsIfNeeded() {
    if (!this.config.logToFile) return;
    
    try {
      const stats = await fsPromises.stat(this.currentLogFile);
      
      // Check if log file exceeds max size
      if (stats.size >= this.config.maxLogFileSizeBytes) {
        // Close current stream
        if (this.writeStream) {
          this.writeStream.end();
          this.writeStream = null;
        }
        
        // Rotate log files
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${this.currentLogFile}.${timestamp}`;
        
        await fsPromises.rename(this.currentLogFile, rotatedFile);
        
        // Clean up old log files if we exceed the maximum
        const logFiles = await fsPromises.readdir(this.config.logDir);
        const rotatedLogs = logFiles
          .filter(file => file.startsWith(`${this.config.logFilePrefix}-`) && file.includes('.log.'))
          .sort();
        
        if (rotatedLogs.length > this.config.maxLogFiles) {
          const filesToDelete = rotatedLogs.slice(0, rotatedLogs.length - this.config.maxLogFiles);
          for (const file of filesToDelete) {
            await fsPromises.unlink(path.join(this.config.logDir, file));
          }
        }
        
        // Open a new log stream
        this.openLogStream();
      }
    } catch (err) {
      // If we can't rotate logs, just continue with the current file
      // [MCP POLICY] STDIO logging is disabled. Log rotation errors are ignored or handled silently.
    }
  }

  /**
   * Format a log message with metadata
   */
  private formatLogMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const levelStr = LOG_LEVEL_STRINGS[level];
    
    const logEntry: Record<string, unknown> = {
      timestamp: this.config.includeTimestamps ? timestamp : undefined,
      level: levelStr,
      message,
      ...(meta && Object.keys(meta).length > 0 && { meta }),
      ...(this.config.includeRequestId && this.requestId && { requestId: this.requestId })
    };
    
    // Remove undefined values
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) {
        delete logEntry[key];
      }
    });
    
    return JSON.stringify(logEntry);
  }
  
  /**
   * Internal method to write a log entry
   */
  private async writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>): Promise<void> {
    if (level > this.config.level) return;
    
    try {
      await this.ensureInitialized();
      const logLine = this.formatLogMessage(level, message, meta) + '\n';
      
      // Write to file if enabled
      if (this.config.logToFile && this.writeStream) {
        try {
          await this.rotateLogsIfNeeded();
          await new Promise<void>((resolve, reject) => {
            this.writeStream?.write(logLine, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (err) {
          // Fallback to stderr if file writing fails
          process.stderr.write(`[${LOG_LEVEL_STRINGS[level]}] ${message}\n`);
        }
      }
      
      // Write to console if enabled (avoid in production)
      if (this.config.logToConsole) {
        const consoleMethod = level === LogLevel.ERROR ? process.stderr : process.stdout;
        const formatted = this.config.includeTimestamps 
          ? `[${new Date().toISOString()}] [${LOG_LEVEL_STRINGS[level]}] ${message}`
          : `[${LOG_LEVEL_STRINGS[level]}] ${message}`;
          
        consoleMethod.write(`${formatted}\n`);
        if (meta && Object.keys(meta).length > 0) {
          consoleMethod.write(`${JSON.stringify(meta, null, 2)}\n`);
        }
      }
    } catch (error) {
      // Last resort error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[LOGGER_ERROR] Failed to write log: ${errorMessage}\n`);
    }
  }

  // Public logging methods
  
  /**
   * Log an error message
   */
  public error(message: string, meta?: Record<string, unknown>): void {
    this.writeLog(LogLevel.ERROR, message, meta).catch(() => {
      process.stderr.write(`[ERROR] ${message}\n`);
    });
  }

  /**
   * Log a warning message
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.writeLog(LogLevel.WARN, message, meta).catch(() => {
      process.stderr.write(`[WARN] ${message}\n`);
    });
  }

  /**
   * Log an informational message
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.writeLog(LogLevel.INFO, message, meta);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.writeLog(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log a trace message
   */
  public trace(message: string, meta?: Record<string, unknown>): void {
    this.writeLog(LogLevel.TRACE, message, meta);
  }

  // Configuration methods
  public setLevel(level: LogLevel) {
    this.config.level = level;
  }

  public getLevel(): LogLevel {
    return this.config.level;
  }

  // Clean up resources
  public close() {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

// Create a singleton logger instance with lazy initialization
let loggerInstance: Logger | null = null;

// Function to get or create the logger instance
export function getLogger(config: Partial<LoggerConfig> = {}): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  } else if (Object.keys(config).length > 0) {
    // If logger already exists but new config is provided, update it
    Object.assign(loggerInstance['config'], config);
  }
  return loggerInstance;
}

// Export the Logger class for custom instances
export { Logger };

// Default export for backward compatibility
const defaultLogger = getLogger();
export default defaultLogger;
