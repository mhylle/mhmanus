import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          context,
          trace,
          ...meta,
        });
      }),
    );

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    });

    // File transport for production
    const fileTransport = new winston.transports.DailyRotateFile({
      filename: 'logs/mhmanus-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    });

    // Error file transport
    const errorTransport = new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: logFormat,
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'mhmanus-backend' },
      transports: [
        consoleTransport,
        fileTransport,
        errorTransport,
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom methods for structured logging
  logAgentEvent(event: {
    agentId: string;
    agentType: string;
    action: string;
    taskId?: string;
    metadata?: any;
  }) {
    this.logger.info('Agent event', {
      context: 'AgentSystem',
      ...event,
    });
  }

  logTaskEvent(event: {
    taskId: string;
    status: string;
    type?: string;
    duration?: number;
    error?: string;
  }) {
    this.logger.info('Task event', {
      context: 'TaskSystem',
      ...event,
    });
  }

  logToolUsage(event: {
    toolName: string;
    category: string;
    agentId: string;
    duration: number;
    success: boolean;
    error?: string;
  }) {
    this.logger.info('Tool usage', {
      context: 'ToolSystem',
      ...event,
    });
  }

  logLLMRequest(event: {
    model: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
    duration: number;
    success: boolean;
  }) {
    this.logger.info('LLM request', {
      context: 'LLMSystem',
      ...event,
    });
  }
}