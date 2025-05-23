import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Define log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Map log levels to string representations
const LOG_LEVEL_STRINGS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE'
};

// Logger configuration interface
interface LoggerConfig {
  level: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logDir: string;
  logFilePrefix: string;
  maxLogFileSizeBytes: number;
  maxLogFiles: number;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  logToFile: true,
  // WARNING: NEVER enable logToConsole in MCP STDIO JSON environments! Only set to true for local debugging.
  logToConsole: false,
  logDir: path.join(process.cwd(), 'logs'),
  logFilePrefix: 'app',
  maxLogFileSizeBytes: 5 * 1024 * 1024, // 5MB
  maxLogFiles: 5
};

class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private initializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // MCP STDIO JSON best practice: logToConsole must remain false in production environments to prevent breaking JSON output.
    if (this.config.logToConsole) {
      // [MCP POLICY] STDIO logging is disabled. No warning to console.
      // Optionally, could log to file or ignore.
    }
    this.currentLogFile = this.getLogFilePath();
    // Don't initialize here, will be done lazily
  }

  private async ensureInitialized() {
    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }
    if (this.initialized) return;
    
    this.initializing = true;
    this.initPromise = this.initializeLogger();
    await this.initPromise;
    this.initializing = false;
  }

  private get initialized(): boolean {
    return !this.initializing && this.initPromise !== null;
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

  private formatLogMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LOG_LEVEL_STRINGS[level];
    
    let formattedMeta = '';
    if (meta) {
      try {
        formattedMeta = typeof meta === 'string' ? meta : JSON.stringify(meta);
      } catch (err) {
        formattedMeta = '[Unstringifiable Object]';
      }
    }
    
    return `[${timestamp}] [${levelStr}] ${message}${formattedMeta ? ' ' + formattedMeta : ''}`;
  }

  private async log(level: LogLevel, message: string, meta?: any) {
    // Skip if log level is higher than configured level
    if (level > this.config.level) return;
    
    // Ensure logger is initialized
    if (!this.initialized) {
      try {
        await this.ensureInitialized();
      } catch (error) {
        // If initialization fails, fall back to console.error for critical errors
        if (level <= LogLevel.ERROR) {
          console.error(`[LOGGER_INIT_ERROR] ${message}`, meta);
        }
        return;
      }
    }
    
    const logMessage = this.formatLogMessage(level, message, meta);
    
    // Log to file if enabled
    if (this.config.logToFile && this.writeStream) {
      try {
        this.writeStream.write(logMessage + '\n');
        await this.rotateLogsIfNeeded();
      } catch (error) {
        // If file writing fails, fall back to console.error for critical errors
        if (level <= LogLevel.ERROR) {
          console.error(`[LOGGER_WRITE_ERROR] ${message}`, meta);
        }
      }
    }
    
    // Log to console if enabled, but use stderr to avoid breaking STDIO JSON output
    if (this.config.logToConsole) {
      // Using stderr to avoid breaking STDIO JSON protocol
      console.error(logMessage);
    }
  }

  // Public logging methods
  public error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, message, meta);
  }

  public warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }

  public info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }

  public debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public trace(message: string, meta?: any) {
    this.log(LogLevel.TRACE, message, meta);
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
