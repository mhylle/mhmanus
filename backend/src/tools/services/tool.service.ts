import { Injectable, Logger } from '@nestjs/common';
import { MCPClientService } from '../mcp/mcp-client.service';
import { ExecutionService } from '../../execution/services/execution.service';
import { 
  ToolContext, 
  ToolResult, 
  ToolDefinition, 
  ToolPermission,
  ToolCategory,
} from '../interfaces/tool.interface';
import { getServersByPermission, MCP_SERVERS } from '../mcp/mcp.config';

@Injectable()
export class ToolService {
  private readonly logger = new Logger(ToolService.name);

  constructor(
    private mcpClient: MCPClientService,
    private executionService: ExecutionService,
  ) {
    this.initializeDefaultServers();
  }

  private async initializeDefaultServers() {
    // Connect to servers marked as autoStart
    for (const [name, config] of Object.entries(MCP_SERVERS)) {
      if (config.autoStart) {
        try {
          await this.mcpClient.connectToServer(name);
        } catch (error) {
          this.logger.error(`Failed to auto-start MCP server ${name}: ${error.message}`);
        }
      }
    }
  }

  async executeToolWithPermissions(
    toolName: string,
    args: any,
    context: ToolContext,
  ): Promise<ToolResult> {
    // Find which server provides this tool
    const serverName = await this.findServerForTool(toolName);
    if (!serverName) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
      };
    }

    // Check permissions
    const serverConfig = MCP_SERVERS[serverName];
    const missingPermissions = serverConfig.permissions.filter(
      p => !context.permissions.includes(p)
    );

    if (missingPermissions.length > 0) {
      return {
        success: false,
        error: `Missing required permissions: ${missingPermissions.join(', ')}`,
      };
    }

    // Execute the tool
    return await this.mcpClient.callTool(serverName, toolName, args);
  }

  async listAvailableTools(context?: ToolContext): Promise<ToolDefinition[]> {
    const allTools: ToolDefinition[] = [];

    // Get tools from connected servers
    for (const serverName of this.mcpClient.getConnectedServers()) {
      const tools = await this.mcpClient.listTools(serverName);
      
      // Filter by permissions if context provided
      if (context) {
        const serverConfig = MCP_SERVERS[serverName];
        const hasPermissions = serverConfig.permissions.every(
          p => context.permissions.includes(p)
        );
        
        if (hasPermissions) {
          allTools.push(...tools);
        }
      } else {
        allTools.push(...tools);
      }
    }

    return allTools;
  }

  async findToolsByCategory(category: ToolCategory): Promise<ToolDefinition[]> {
    const tools = await this.listAvailableTools();
    return tools.filter(tool => tool.category === category);
  }

  async connectServerForPermission(permission: ToolPermission): Promise<void> {
    const servers = getServersByPermission(permission);
    
    for (const serverName of servers) {
      if (!this.mcpClient.isServerConnected(serverName)) {
        try {
          await this.mcpClient.connectToServer(serverName);
          return; // Connected successfully
        } catch (error) {
          this.logger.warn(`Failed to connect to ${serverName}: ${error.message}`);
        }
      }
    }
  }

  // File system operations
  async readFile(path: string, context: ToolContext): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'read_file',
      { path },
      context,
    );
  }

  async writeFile(
    path: string, 
    content: string, 
    context: ToolContext,
  ): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'write_file',
      { path, content },
      context,
    );
  }

  async listDirectory(path: string, context: ToolContext): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'list_directory',
      { path },
      context,
    );
  }

  // Network operations
  async fetchUrl(url: string, context: ToolContext): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'fetch',
      { url },
      context,
    );
  }

  async searchWeb(query: string, context: ToolContext): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'brave_web_search',
      { query },
      context,
    );
  }

  // Git operations
  async gitStatus(path: string, context: ToolContext): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'git_status',
      { repo_path: path },
      context,
    );
  }

  async gitCommit(
    path: string,
    message: string,
    context: ToolContext,
  ): Promise<ToolResult> {
    return this.executeToolWithPermissions(
      'git_commit',
      { repo_path: path, message },
      context,
    );
  }

  // Shell operations (using sandbox for safety)
  async executeShellCommand(
    command: string,
    context: ToolContext,
  ): Promise<ToolResult> {
    if (!context.permissions.includes(ToolPermission.ShellExecute)) {
      return {
        success: false,
        error: 'Missing shell execute permission',
      };
    }

    try {
      const result = await this.executionService.execute({
        taskId: context.taskId,
        language: 'bash',
        files: [],
        command,
        timeout: context.timeout || 30000,
        environment: context.environment,
      });

      return {
        success: result.success,
        output: result.stdout,
        error: result.stderr || result.error,
        artifacts: result.files.map(f => ({
          type: 'file' as const,
          name: f.path,
          path: f.path,
          content: f.content,
        })),
        usage: {
          duration: result.duration,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async findServerForTool(toolName: string): Promise<string | null> {
    for (const serverName of this.mcpClient.getConnectedServers()) {
      const tools = await this.mcpClient.listTools(serverName);
      if (tools.some(t => t.name === toolName)) {
        return serverName;
      }
    }
    
    // Try connecting to servers that might have this tool
    for (const [serverName, config] of Object.entries(MCP_SERVERS)) {
      if (!this.mcpClient.isServerConnected(serverName)) {
        try {
          await this.mcpClient.connectToServer(serverName);
          const tools = await this.mcpClient.listTools(serverName);
          if (tools.some(t => t.name === toolName)) {
            return serverName;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
    
    return null;
  }
}