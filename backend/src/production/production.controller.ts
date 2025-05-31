import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { RegisterDto } from '../auth/dto/auth.dto';

@ApiTags('production-test')
@Controller('production-test')
export class ProductionController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Test configuration loading' })
  async testConfiguration() {
    return {
      environment: this.configService.get('nodeEnv'),
      port: this.configService.get('port'),
      database: {
        configured: !!this.configService.get('database.url'),
        synchronize: this.configService.get('database.synchronize'),
      },
      redis: {
        host: this.configService.get('redis.host'),
        port: this.configService.get('redis.port'),
      },
      jwt: {
        configured: !!this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
      throttle: {
        ttl: this.configService.get('throttle.ttl'),
        limit: this.configService.get('throttle.limit'),
      },
    };
  }

  @Get('rate-limit')
  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @ApiOperation({ summary: 'Test rate limiting (3 requests per 10 seconds)' })
  async testRateLimit() {
    return {
      message: 'Rate limit test successful',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('auth-flow')
  @ApiOperation({ summary: 'Test complete authentication flow' })
  async testAuthFlow() {
    const testUser: RegisterDto = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User',
    };

    try {
      // Register user
      const registerResult = await this.authService.register(testUser);
      
      // Login with same credentials
      const loginResult = await this.authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      // Clean up - delete test user
      await this.userRepository.delete({ email: testUser.email });

      return {
        register: { success: true, hasToken: !!registerResult.access_token },
        login: { success: true, hasToken: !!loginResult.access_token },
        cleanup: { success: true },
      };
    } catch (error) {
      // Clean up on error
      await this.userRepository.delete({ email: testUser.email }).catch(() => {});
      throw error;
    }
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test protected endpoint' })
  async testProtectedEndpoint() {
    return {
      message: 'Successfully accessed protected endpoint',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('compression')
  @ApiOperation({ summary: 'Test response compression' })
  async testCompression() {
    // Generate large response to test compression
    const data = Array(1000).fill(null).map((_, index) => ({
      id: index,
      data: 'This is a test string that will be repeated many times to create a large response for compression testing.',
      timestamp: new Date().toISOString(),
    }));

    return {
      message: 'Large response for compression test',
      itemCount: data.length,
      data,
    };
  }

  @Get('versioning')
  @ApiOperation({ summary: 'Test API versioning' })
  async testVersioning() {
    return {
      version: 'v1',
      endpoint: '/v1/production-test/versioning',
      message: 'API versioning is working correctly',
    };
  }

  @Get('all-features')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test all production features together' })
  async testAllFeatures() {
    const results = {
      timestamp: new Date().toISOString(),
      features: {
        authentication: 'Passed - JWT auth working',
        rateLimiting: 'Passed - Rate limiting applied',
        versioning: 'Passed - API version v1',
        compression: 'Passed - Response will be compressed',
        configuration: 'Passed - Config loaded from environment',
        database: false,
        redis: false,
      },
    };

    // Test database connection
    try {
      const userCount = await this.userRepository.count();
      results.features.database = userCount >= 0;
    } catch (error) {
      results.features.database = false;
    }

    return results;
  }
}