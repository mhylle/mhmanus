import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as api from '@opentelemetry/api';
import { TracingService } from '../services/tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private readonly tracingService: TracingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const span = this.tracingService.startSpan(`${req.method} ${req.path}`, {
      kind: api.SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.user_agent': req.headers['user-agent'],
        'http.request_content_length': req.headers['content-length'],
      },
    });

    // Store span in request for later use
    (req as any).span = span;

    // Capture response data
    const originalSend = res.send;
    res.send = function (data) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': res.get('content-length'),
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: api.SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: api.SpanStatusCode.OK });
      }

      span.end();
      return originalSend.call(this, data);
    };

    // Handle errors
    res.on('finish', () => {
      if (!span.ended) {
        span.end();
      }
    });

    next();
  }
}