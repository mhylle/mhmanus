import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExecutionService, ExecutionRequest, ExecutionResult } from './services/execution.service';
import { FileSystemService } from './services/filesystem.service';

@ApiTags('execution')
@Controller('execution')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly fileSystemService: FileSystemService,
  ) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute code in a sandboxed environment' })
  @ApiResponse({ status: 200, description: 'Execution completed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async executeCode(@Body() request: ExecutionRequest): Promise<ExecutionResult> {
    // Validate request
    const errors = await this.executionService.validateExecutionRequest(request);
    if (errors.length > 0) {
      throw new HttpException(
        { message: 'Invalid execution request', errors },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.executionService.execute(request);
    } catch (error) {
      throw new HttpException(
        { message: 'Execution failed', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('workspaces/:taskId')
  @ApiOperation({ summary: 'Get workspace file structure for a task' })
  @ApiResponse({ status: 200, description: 'Workspace contents' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getWorkspaceFiles(@Param('taskId') taskId: string) {
    // This would need to be implemented to find the workspace by taskId
    // For now, return a placeholder
    return {
      message: 'Workspace inspection not yet implemented',
      taskId,
    };
  }

  @Delete('workspaces/:taskId')
  @ApiOperation({ summary: 'Clean up workspace for a task' })
  @ApiResponse({ status: 200, description: 'Workspace cleaned up' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async cleanupWorkspace(@Param('taskId') taskId: string) {
    // This would need to be implemented to find and clean the workspace
    return {
      message: 'Workspace cleanup not yet implemented',
      taskId,
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test execution with a simple script' })
  @ApiResponse({ status: 200, description: 'Test execution result' })
  async testExecution(): Promise<ExecutionResult> {
    // Very simple test execution
    const testRequest: ExecutionRequest = {
      taskId: 'test-' + Date.now(),
      language: 'bash',
      files: [
        {
          path: 'hello.txt',
          content: 'Hello from file!',
        },
      ],
      command: 'echo "Starting test..." && cat hello.txt && echo "Test complete!"',
      timeout: 10000,
    };

    try {
      const result = await this.executionService.execute(testRequest);
      console.log('Test execution result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('Test execution error:', error);
      throw error;
    }
  }
}