/**
 * Structured logging system for the application
 * Replaces console.log/error scattered throughout the codebase
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isTest = process.env.NODE_ENV === "test";

  /**
   * Format log entry for output
   */
  private formatLog(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const emoji = this.getEmoji(entry.level);
    const context = entry.context ? `[${entry.context}]` : "";

    let message = `${timestamp} ${emoji} ${entry.level.toUpperCase()} ${context} ${entry.message}`;

    if (entry.data) {
      message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (this.isDevelopment && entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  /**
   * Get emoji for log level
   */
  private getEmoji(level: LogLevel): string {
    switch (level) {
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
      case "debug":
        return "🔍";
      default:
        return "📝";
    }
  }

  /**
   * Log entry to console (only in development)
   */
  private log(entry: LogEntry): void {
    // Skip logging in test environment
    if (this.isTest) return;

    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown, context?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      data,
      context,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown, context?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      data,
      context,
    });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: unknown, context?: string): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    this.log({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      error: errorObj,
      data,
      context,
    });
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: unknown, context?: string): void {
    if (!this.isDevelopment) return;

    this.log({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      data,
      context,
    });
  }

  /**
   * Create a logger with a specific context
   */
  context(contextName: string) {
    return {
      info: (message: string, data?: unknown) => this.info(message, data, contextName),
      warn: (message: string, data?: unknown) => this.warn(message, data, contextName),
      error: (message: string, error?: Error | unknown, data?: unknown) =>
        this.error(message, error, data, contextName),
      debug: (message: string, data?: unknown) => this.debug(message, data, contextName),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export context creators for specific modules
export const authLogger = logger.context("AUTH");
export const apiLogger = logger.context("API");
export const dbLogger = logger.context("DATABASE");
export const middlewareLogger = logger.context("MIDDLEWARE");
