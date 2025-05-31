import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './services/execution.service';
import { FileSystemService } from './services/filesystem.service';
import { SandboxService } from './services/sandbox.service';
import { ResourceMonitor } from './services/resource-monitor.service';

@Module({
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    FileSystemService,
    SandboxService,
    ResourceMonitor,
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}