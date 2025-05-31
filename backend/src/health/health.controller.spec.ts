import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator, HttpHealthIndicator } from '@nestjs/terminus';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockHealthCheckService = {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      info: {
        database: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
        storage: { status: 'up' },
        redis: { status: 'up' },
        bull_queue: { status: 'up' },
        ollama: { status: 'up' },
      },
      error: {},
      details: {},
    }),
  };

  const mockHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
    checkStorage: jest.fn().mockResolvedValue({ storage: { status: 'up' } }),
  };

  const mockHealthService = {
    checkRedis: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
    checkBullQueue: jest.fn().mockResolvedValue({ bull_queue: { status: 'up' } }),
    checkOllama: jest.fn().mockResolvedValue({ ollama: { status: 'up' } }),
    checkEssentialServices: jest.fn().mockResolvedValue({ services: { status: 'up' } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HttpHealthIndicator, useValue: {} },
        { provide: TypeOrmHealthIndicator, useValue: mockHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockHealthIndicator },
        { provide: DiskHealthIndicator, useValue: mockHealthIndicator },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('should return readiness status', async () => {
      const result = await controller.readiness();
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });
});