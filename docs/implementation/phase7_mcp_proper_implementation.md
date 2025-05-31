# Phase 7: Proper MCP Integration

## Research Summary

After thorough research, here's what I found:

### Official MCP Packages

1. **Core SDK**: `@modelcontextprotocol/sdk` (v1.12.1)
2. **Official Servers**:
   - `@modelcontextprotocol/server-filesystem` - File operations
   - `@modelcontextprotocol/server-memory` - Persistent memory
   - `@modelcontextprotocol/server-time` - Time utilities
   - `@modelcontextprotocol/server-fetch` - Web content fetching

3. **Community Servers** (via npm):
   - Various database connectors (PostgreSQL, SQLite, Neo4j)
   - Cloud service integrations (AWS, Azure, Google Cloud)
   - Development tools (Git, GitHub, GitLab)
   - Communication platforms (Slack, Discord)

### Key Implementation Details

1. **Import Statements** - Must use .js extensions:
   ```typescript
   import { Client } from "@modelcontextprotocol/sdk/client/index.js";
   import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
   ```

2. **Transport Mechanisms**:
   - **stdio**: For local processes (recommended for our use case)
   - **Streamable HTTP**: For remote servers

3. **Security Model**:
   - Servers only operate within explicitly allowed directories
   - No implicit access to filesystem
   - OAuth 2.1 for remote servers (as of 2025-03-26 spec)

## Revised Implementation Plan

### 1. Install Official MCP Servers

```bash
npm install --save \
  @modelcontextprotocol/sdk \
  @modelcontextprotocol/server-filesystem \
  @modelcontextprotocol/server-memory \
  @modelcontextprotocol/server-fetch
```

### 2. MCP Client Service (Corrected)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

@Injectable()
export class MCPClientService {
  private clients = new Map<string, Client>();

  async connectToServer(serverName: string, config: MCPServerConfig) {
    const client = new Client({
      name: "mhmanus-agent-system",
      version: "1.0.0",
    });

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    await client.connect(transport);
    this.clients.set(serverName, client);
  }

  async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);
    
    return await client.callTool({ name: toolName, arguments: args });
  }
}
```

### 3. Server Configuration

```typescript
export const MCP_SERVERS = {
  filesystem: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/tmp/mhmanus-workspaces", // Agent workspaces
      "/home/mhmanus/projects",  // Project access
    ],
    permissions: [ToolPermission.FileRead, ToolPermission.FileWrite],
  },
  
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    permissions: [],
  },

  fetch: {
    command: "npx", 
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    permissions: [ToolPermission.NetworkAccess],
  },
};
```

### 4. Available Tools per Server

**Filesystem Server**:
- `read_file` - Read complete file contents
- `write_file` - Create or overwrite files  
- `edit_file` - Pattern-based file editing
- `create_directory` - Create directories
- `list_directory` - List directory contents
- `move_file` - Move/rename files
- `search_files` - Search for files
- `get_file_info` - Get file metadata

**Memory Server**:
- `create_entities` - Store knowledge
- `create_relations` - Create relationships
- `search_entities` - Query stored knowledge
- `open_nodes` - Navigate knowledge graph

**Fetch Server**:
- `fetch` - Retrieve web content
- Converts HTML to markdown for LLM consumption

### 5. Integration with Agents

```typescript
// In CodeAgent
async writeGeneratedCode(code: string, filepath: string) {
  const result = await this.toolService.callMCPTool(
    'filesystem',
    'write_file',
    {
      path: filepath,
      content: code,
    }
  );
  
  if (!result.success) {
    throw new Error(`Failed to write file: ${result.error}`);
  }
}
```

## Benefits of Using Official MCP Servers

1. **No Build Required**: Use npx to run servers directly
2. **Maintained**: Official servers are actively maintained
3. **Standardized**: Follow MCP specification exactly
4. **Secure**: Built-in security models and sandboxing
5. **Extensible**: Easy to add new servers as needed

## Migration from Custom Implementation

1. Remove custom MCP server builds
2. Update imports to use .js extensions
3. Use npx for server execution
4. Configure allowed directories properly
5. Test with official server tools

## Next Steps

1. ✅ Research MCP specification and ecosystem
2. ✅ Install official MCP SDK and servers
3. ✅ Implement proper MCP client service
4. ✅ Configure official servers
5. ✅ Integrate with agent system
6. ✅ Test with real tool calls