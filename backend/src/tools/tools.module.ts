import { Module } from '@nestjs/common';
import { MCPClientService } from './mcp/mcp-client.service';
import { ToolService } from './services/tool.service';
import { ToolsController } from './tools.controller';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [ExecutionModule],
  controllers: [ToolsController],
  providers: [MCPClientService, ToolService],
  exports: [ToolService, MCPClientService],
})
export class ToolsModule {}