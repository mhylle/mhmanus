import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as api from '@opentelemetry/api';

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private sdk: NodeSDK;
  private tracer: api.Tracer;

  async onModuleInit() {
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:4318/v1/traces',
    });

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'mhmanus-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });

    this.sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(jaegerExporter),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        }),
      ],
    });

    await this.sdk.start();
    this.tracer = api.trace.getTracer('mhmanus-backend', '1.0.0');
    
    console.log('Tracing initialized with Jaeger');
  }

  async onModuleDestroy() {
    await this.sdk.shutdown();
  }

  getTracer(): api.Tracer {
    return this.tracer;
  }

  startSpan(name: string, options?: api.SpanOptions): api.Span {
    return this.tracer.startSpan(name, options);
  }

  // Helper method to trace async operations
  async traceAsync<T>(
    name: string,
    fn: (span: api.Span) => Promise<T>,
    attributes?: api.Attributes,
  ): Promise<T> {
    const span = this.startSpan(name);
    
    if (attributes) {
      span.setAttributes(attributes);
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: api.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Create a child span in the current context
  createChildSpan(name: string, parentSpan?: api.Span): api.Span {
    const ctx = parentSpan 
      ? api.trace.setSpan(api.context.active(), parentSpan)
      : api.context.active();
    
    return this.tracer.startSpan(name, undefined, ctx);
  }

  // Add event to current span
  addEvent(name: string, attributes?: api.Attributes) {
    const span = api.trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  // Set attributes on current span
  setAttributes(attributes: api.Attributes) {
    const span = api.trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  // Create trace context for propagation
  createTraceContext(): api.Context {
    return api.context.active();
  }

  // Extract trace context from carrier (e.g., HTTP headers)
  extractContext(carrier: any): api.Context {
    return api.propagation.extract(api.context.active(), carrier);
  }

  // Inject trace context into carrier
  injectContext(context: api.Context, carrier: any) {
    api.propagation.inject(context, carrier);
  }
}