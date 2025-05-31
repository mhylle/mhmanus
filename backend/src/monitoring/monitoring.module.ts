import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './services/metrics.service';
import { TracingService } from './services/tracing.service';
import { CustomMetricsService } from './services/custom-metrics.service';
import { AgentMetricsService } from './services/agent-metrics.service';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { TracingMiddleware } from './middleware/tracing.middleware';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'mhmanus_',
        },
      },
      defaultLabels: {
        app: 'mhmanus',
        version: '1.0.0',
      },
    }),
  ],
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    TracingService,
    CustomMetricsService,
    AgentMetricsService,
    ...MetricsService.getProviders(),
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    TracingMiddleware,
  ],
  exports: [
    MetricsService,
    TracingService,
    CustomMetricsService,
    AgentMetricsService,
    TracingMiddleware,
  ],
})
export class MonitoringModule {}