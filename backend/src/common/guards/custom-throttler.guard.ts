import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerOptions[],
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as the default tracker
    const ip = req.ip || req.connection.remoteAddress;
    
    // You can also use user ID if authenticated
    if (req.user && req.user.id) {
      return Promise.resolve(`user-${req.user.id}`);
    }
    
    return Promise.resolve(ip);
  }

  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    suffix: string,
  ): string {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    
    // Create a more specific key based on the endpoint
    return `${tracker}-${method}-${url}-${suffix}`;
  }
}