# Phase 7: MCP (Model Context Protocol) Integration

## Overview

Instead of building custom tools, we'll integrate MCP servers to provide tool capabilities to our agents. MCP is an open protocol that enables AI systems to securely access tools and data sources.

## Why MCP?

1. **Standard Protocol**: Industry-standard for AI tool integration
2. **Security**: Built-in security model with capability-based permissions
3. **Ecosystem**: Large collection of existing MCP servers
4. **Interoperability**: Works across different AI systems
5. **Maintenance**: Community-maintained tools

## Architecture

### MCP Integration Components

1. **MCP Client**
   - Connects to MCP servers
   - Handles protocol communication
   - Manages server lifecycle
   - Routes tool calls

2. **MCP Server Manager**
   - Discovers available MCP servers
   - Starts/stops servers as needed
   - Manages server configurations
   - Handles authentication

3. **Tool Adapter**
   - Wraps MCP tools for agent use
   - Translates between agent calls and MCP protocol
   - Handles async operations
   - Manages tool state

4. **Security Layer**
   - Validates agent permissions
   - Enforces resource limits
   - Audits tool usage
   - Prevents unauthorized access

## Available MCP Servers

From the `mcp-servers` directory, we already have:

1. **filesystem** - File operations
2. **git** - Version control
3. **github** - GitHub API access
4. **brave-search** - Web search
5. **postgres** - Database access
6. **sqlite** - Local database
7. **fetch** - HTTP requests
8. **memory** - Persistent memory
9. **slack** - Slack integration
10. **puppeteer** - Browser automation

## Implementation Plan

### 1. MCP Client Service (`tools/mcp/mcp-client.service.ts`)
```typescript
@Injectable()
export class MCPClientService {
  private clients: Map<string, MCPClient> = new Map();
  
  async connectToServer(
    serverName: string,
    config: MCPServerConfig
  ): Promise<void> {
    const client = new MCPClient({
      name: serverName,
      version: '1.0.0',
    });
    
    await client.connect(config.transport);
    this.clients.set(serverName, client);
  }
  
  async callTool(
    serverName: string,
    toolName: string,
    arguments: any
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server ${serverName} not connected`);
    
    return await client.callTool(toolName, arguments);
  }
}
```

### 2. MCP Server Configuration (`tools/mcp/mcp.config.ts`)
```typescript
export const MCP_SERVERS = {
  filesystem: {
    command: 'node',
    args: ['./mcp-servers/dist/filesystem/index.js'],
    transport: 'stdio',
    permissions: ['read', 'write', 'list'],
  },
  git: {
    command: 'python',
    args: ['-m', 'mcp_server_git'],
    transport: 'stdio',
    permissions: ['read', 'write', 'execute'],
  },
  github: {
    command: 'node',
    args: ['./mcp-servers/dist/github/index.js'],
    transport: 'stdio',
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    },
  },
  // ... other servers
};
```

### 3. Tool Service for Agents (`tools/tool.service.ts`)
```typescript
@Injectable()
export class ToolService {
  constructor(
    private mcpClient: MCPClientService,
    private executionService: ExecutionService,
  ) {}
  
  async executeFilesystemOperation(
    operation: string,
    params: any,
    context: ToolContext
  ): Promise<ToolResult> {
    // For filesystem operations, use MCP server
    if (this.isSafeFileOperation(operation)) {
      return await this.mcpClient.callTool('filesystem', operation, params);
    }
    
    // For potentially dangerous operations, use sandbox
    return await this.executionService.execute({
      taskId: context.taskId,
      language: 'bash',
      files: [],
      command: this.buildSafeCommand(operation, params),
      timeout: context.timeout,
    });
  }
}
```

### 4. Agent Integration
```typescript
// In CodeAgent
private async writeGeneratedCode(code: string, filepath: string) {
  // Use MCP filesystem server
  const result = await this.toolService.executeFilesystemOperation(
    'write_file',
    {
      path: filepath,
      content: code,
    },
    {
      agentId: this.id,
      taskId: this.currentTask.id,
      workspace: this.workspace,
    }
  );
  
  if (!result.success) {
    throw new Error(`Failed to write file: ${result.error}`);
  }
}
```

## Security Considerations

1. **Server Isolation**: Each MCP server runs in its own process
2. **Permission Model**: Agents must declare required permissions
3. **Resource Limits**: CPU, memory, and time limits enforced
4. **Audit Trail**: All tool usage logged for security review
5. **Sandboxing**: Dangerous operations run in Docker containers

## Benefits of MCP Integration

1. **Immediate Capabilities**: Access to 10+ tools without custom development
2. **Maintained Tools**: Community maintains and updates MCP servers
3. **Extensibility**: Easy to add new MCP servers
4. **Standardization**: Following industry standards
5. **Debugging**: MCP includes debugging and inspection tools

## Implementation Steps

1. ✅ Install MCP TypeScript SDK
2. ✅ Create MCP client service
3. ✅ Configure available MCP servers
4. ✅ Build tool service wrapper
5. ✅ Integrate with agents
6. ✅ Add security layer
7. ✅ Test with each MCP server

## Next Phase Preview

With MCP integration complete, agents will have access to:
- File system operations
- Git version control
- GitHub API
- Web search
- Database access
- HTTP requests
- Browser automation

This enables Phase 8: Learning & Adaptation, where agents learn from their tool usage patterns.