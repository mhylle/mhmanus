import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ToolService } from './services/tool.service';
import { MCPClientService } from './mcp/mcp-client.service';
import { ToolContext, ToolPermission } from './interfaces/tool.interface';

@ApiTags('tools')
@Controller('tools')
export class ToolsController {
  constructor(
    private readonly toolService: ToolService,
    private readonly mcpClient: MCPClientService,
  ) {}

  @Get('servers')
  @ApiOperation({ summary: 'List connected MCP servers' })
  @ApiResponse({ status: 200, description: 'List of connected servers' })
  async getConnectedServers() {
    return {
      servers: this.mcpClient.getConnectedServers(),
    };
  }

  @Post('servers/:name/connect')
  @ApiOperation({ summary: 'Connect to an MCP server' })
  @ApiResponse({ status: 200, description: 'Server connected' })
  @ApiResponse({ status: 400, description: 'Connection failed' })
  async connectServer(@Param('name') serverName: string) {
    try {
      await this.mcpClient.connectToServer(serverName);
      return { 
        success: true, 
        message: `Connected to ${serverName}`,
      };
    } catch (error) {
      throw new HttpException(
        { message: `Failed to connect to ${serverName}`, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('servers/:name/disconnect')
  @ApiOperation({ summary: 'Disconnect from an MCP server' })
  @ApiResponse({ status: 200, description: 'Server disconnected' })
  async disconnectServer(@Param('name') serverName: string) {
    await this.mcpClient.disconnectServer(serverName);
    return { 
      success: true, 
      message: `Disconnected from ${serverName}`,
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'List available tools' })
  @ApiResponse({ status: 200, description: 'List of tools' })
  async listTools(@Query('server') serverName?: string) {
    const tools = await this.mcpClient.listTools(serverName);
    return { tools };
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute a tool' })
  @ApiResponse({ status: 200, description: 'Tool execution result' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async executeTool(
    @Body() body: {
      tool: string;
      args: any;
      context: {
        agentId: string;
        taskId: string;
        permissions: ToolPermission[];
      };
    },
  ) {
    const context: ToolContext = {
      agentId: body.context.agentId,
      taskId: body.context.taskId,
      permissions: body.context.permissions,
    };

    const result = await this.toolService.executeToolWithPermissions(
      body.tool,
      body.args,
      context,
    );

    if (!result.success && result.error?.includes('Missing required permissions')) {
      throw new HttpException(
        { message: result.error },
        HttpStatus.FORBIDDEN,
      );
    }

    return result;
  }

  @Post('test/filesystem')
  @ApiOperation({ summary: 'Test filesystem operations' })
  @ApiResponse({ status: 200, description: 'Test results' })
  async testFilesystem() {
    const testContext: ToolContext = {
      agentId: 'test-agent',
      taskId: 'test-task',
      permissions: [
        ToolPermission.FileRead,
        ToolPermission.FileWrite,
      ],
    };

    // Test writing a file
    const writeResult = await this.toolService.writeFile(
      '/tmp/mhmanus-workspaces/mcp-test.txt',
      'Hello from MCP!',
      testContext,
    );

    // Test reading the file
    const readResult = await this.toolService.readFile(
      '/tmp/mhmanus-workspaces/mcp-test.txt',
      testContext,
    );

    // Test listing directory
    const listResult = await this.toolService.listDirectory(
      '/tmp/mhmanus-workspaces',
      testContext,
    );

    return {
      write: writeResult,
      read: readResult,
      list: listResult,
    };
  }

  @Post('test/search')
  @ApiOperation({ summary: 'Test web search' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async testSearch(@Query('q') query: string = 'AI agents') {
    const testContext: ToolContext = {
      agentId: 'test-agent', 
      taskId: 'test-task',
      permissions: [ToolPermission.NetworkAccess],
    };

    return await this.toolService.searchWeb(query, testContext);
  }

  @Post('test/agent-integration')
  @ApiOperation({ summary: 'Test agent-tool integration' })
  @ApiResponse({ status: 200, description: 'Integration test results' })
  async testAgentIntegration() {
    const agentContext: ToolContext = {
      agentId: 'code-agent-001',
      taskId: 'test-code-generation',
      permissions: [
        ToolPermission.FileRead,
        ToolPermission.FileWrite,
      ],
      workspace: '/tmp/mhmanus-workspaces/agent-test',
    };

    // Simulate what an agent would do
    const results = {
      workspace: null,
      files: null,
      structure: null,
    };

    try {
      // 1. Create workspace directory
      await this.toolService.executeToolWithPermissions(
        'create_directory',
        { path: agentContext.workspace },
        agentContext,
      );

      // 2. Write a TypeScript file
      const tsCode = `export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  async createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    };
    
    // TODO: Save to database
    console.log('User created:', user);
    return user;
  }
}`;

      await this.toolService.writeFile(
        `${agentContext.workspace}/user.service.ts`,
        tsCode,
        agentContext,
      );

      // 3. Write a test file
      const testCode = `import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should create a user with generated ID', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
    };

    const user = await service.createUser(userData);

    expect(user.id).toBeDefined();
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});`;

      await this.toolService.writeFile(
        `${agentContext.workspace}/user.service.spec.ts`,
        testCode,
        agentContext,
      );

      // 4. List the created files
      results.files = await this.toolService.listDirectory(
        agentContext.workspace,
        agentContext,
      );

      // 5. Get directory structure
      results.structure = await this.toolService.executeToolWithPermissions(
        'directory_tree',
        { path: agentContext.workspace },
        agentContext,
      );

      results.workspace = agentContext.workspace;

    } catch (error) {
      throw new HttpException(
        { message: 'Agent integration test failed', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      message: 'Agent successfully used MCP tools to generate code',
      results,
    };
  }
}