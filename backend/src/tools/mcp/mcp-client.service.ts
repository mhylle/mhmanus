import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
// @ts-ignore - MCP SDK module resolution
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// @ts-ignore - MCP SDK module resolution  
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConfig, ToolDefinition, ToolResult } from '../interfaces/tool.interface';
import { MCP_SERVERS } from './mcp.config';

interface MCPConnection {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
  tools: Map<string, ToolDefinition>;
}

@Injectable()
export class MCPClientService implements OnModuleDestroy {
  private readonly logger = new Logger(MCPClientService.name);
  private connections: Map<string, MCPConnection> = new Map();

  async onModuleDestroy() {
    // Clean up all connections
    for (const [name, connection] of this.connections) {
      await this.disconnectServer(name);
    }
  }

  async connectToServer(serverName: string): Promise<void> {
    if (this.connections.has(serverName)) {
      this.logger.log(`Already connected to MCP server: ${serverName}`);
      return;
    }

    const config = MCP_SERVERS[serverName];
    if (!config) {
      throw new Error(`Unknown MCP server: ${serverName}`);
    }

    try {
      this.logger.log(`Connecting to MCP server: ${serverName}`);
      this.logger.debug(`Config: ${JSON.stringify(config)}`);

      // Validate config
      if (!config.command) {
        throw new Error(`Missing command for MCP server: ${serverName}`);
      }
      if (!config.args || !Array.isArray(config.args)) {
        throw new Error(`Missing or invalid args for MCP server: ${serverName}`);
      }

      // Create transport - StdioClientTransport handles process spawning
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Create client
      const client = new Client(
        {
          name: 'mhmanus-agent-system',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect
      await client.connect(transport);

      // List available tools
      const toolsResponse = await client.listTools();
      const tools = new Map<string, ToolDefinition>();

      for (const tool of toolsResponse.tools) {
        tools.set(tool.name, {
          name: tool.name,
          description: tool.description || '',
          category: this.inferCategory(serverName),
          permissions: config.permissions,
          parameters: tool.inputSchema,
          returns: tool.outputSchema,
        });
      }

      // Store connection
      this.connections.set(serverName, {
        client,
        transport,
        config,
        tools,
      });

      this.logger.log(`Connected to MCP server: ${serverName} with ${tools.size} tools`);

    } catch (error) {
      this.logger.error(`Failed to connect to MCP server ${serverName}: ${error.message}`);
      throw error;
    }
  }

  async disconnectServer(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      return;
    }

    try {
      await connection.client.close();
      await connection.transport.close();
      this.connections.delete(serverName);
      this.logger.log(`Disconnected from MCP server: ${serverName}`);
    } catch (error) {
      this.logger.error(`Error disconnecting from MCP server ${serverName}: ${error.message}`);
    }
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<ToolResult> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      // Try to connect if not already connected
      await this.connectToServer(serverName);
      const newConnection = this.connections.get(serverName);
      if (!newConnection) {
        throw new Error(`Failed to connect to MCP server: ${serverName}`);
      }
      return this.callTool(serverName, toolName, args);
    }

    try {
      const startTime = Date.now();
      
      const response = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });

      const duration = Date.now() - startTime;

      // MCP tools return content array with text/image parts
      const content = response.content || [];
      const textContent = Array.isArray(content) 
        ? content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('\n')
        : String(content);

      return {
        success: !response.isError,
        output: response.isError ? undefined : textContent || response,
        error: response.isError ? textContent || 'Tool execution failed' : undefined,
        usage: {
          duration,
        },
      };
    } catch (error) {
      this.logger.error(`Tool call failed: ${serverName}.${toolName}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listTools(serverName?: string): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    if (serverName) {
      const connection = this.connections.get(serverName);
      if (connection) {
        tools.push(...connection.tools.values());
      }
    } else {
      for (const connection of this.connections.values()) {
        tools.push(...connection.tools.values());
      }
    }

    return tools;
  }

  getConnectedServers(): string[] {
    return Array.from(this.connections.keys());
  }

  isServerConnected(serverName: string): boolean {
    return this.connections.has(serverName);
  }

  private inferCategory(serverName: string): any {
    const categoryMap = {
      filesystem: 'filesystem',
      git: 'versionControl',
      github: 'versionControl',
      'brave-search': 'network',
      postgres: 'database',
      sqlite: 'database',
      fetch: 'network',
      puppeteer: 'browser',
      slack: 'communication',
      memory: 'analysis',
    };
    return categoryMap[serverName] || 'analysis';
  }
}