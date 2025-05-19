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

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // MCP STDIO JSON best practice: logToConsole must remain false in production environments to prevent breaking JSON output.
    if (this.config.logToConsole) {
      console.error('[LOGGER WARNING] logToConsole is enabled. NEVER enable this in MCP STDIO JSON production environments.');
    }
    this.currentLogFile = this.getLogFilePath();
    this.initializeLogger();
  }

  private async initializeLogger() {
    // Ensure log directory exists
    await fsPromises.mkdir(this.config.logDir, { recursive: true });
    
    // Initialize write stream if logging to file
    if (this.config.logToFile) {
      this.openLogStream();
    }
  }

  private openLogStream() {
    if (this.writeStream) {
      this.writeStream.end();
    }
    
    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    this.writeStream.on('error', (err) => {
      // If we have an error writing to the log file, log to stderr
      // but use a special format to avoid breaking JSON output
      console.error(`[LOGGER_ERROR] Failed to write to log file: ${err.message}`);
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
      console.error(`[LOGGER_ERROR] Failed to rotate logs: ${(err as Error).message}`);
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
    
    const logMessage = this.formatLogMessage(level, message, meta);
    
    // Log to file if enabled
    if (this.config.logToFile && this.writeStream) {
      this.writeStream.write(logMessage + '\n');
      await this.rotateLogsIfNeeded();
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

// Create and export a default logger instance
const logger = new Logger();

// Also export the Logger class for custom instances
export { Logger };

export default logger;
