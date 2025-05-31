import { MCPServerConfig, ToolPermission } from '../interfaces/tool.interface';

export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  filesystem: {
    name: 'filesystem',
    command: 'node',
    args: [
      '/mcp-servers/src/filesystem/dist/index.js',
      '/tmp/mhmanus-workspaces', // Agent workspaces
      '/app', // Project directory (backend mounted at /app)
    ],
    transport: 'stdio',
    permissions: [
      ToolPermission.FileRead,
      ToolPermission.FileWrite,
    ],
    autoStart: true,
  },
  
  git: {
    name: 'git',
    command: 'python',
    args: ['-m', 'mcp_server_git'],
    transport: 'stdio',
    permissions: [
      ToolPermission.FileRead,
      ToolPermission.FileWrite,
      ToolPermission.ShellExecute,
    ],
    autoStart: false,
  },
  
  github: {
    name: 'github',
    command: 'node',
    args: ['/home/mhylle/projects/mhmanus/mcp-servers/dist/github/index.js'],
    transport: 'stdio',
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
    permissions: [
      ToolPermission.NetworkAccess,
    ],
    autoStart: false,
  },
  
  'brave-search': {
    name: 'brave-search',
    command: 'node',
    args: ['/home/mhylle/projects/mhmanus/mcp-servers/dist/brave-search/index.js'],
    transport: 'stdio',
    env: {
      BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
    },
    permissions: [
      ToolPermission.NetworkAccess,
    ],
    autoStart: false,
  },
  
  postgres: {
    name: 'postgres',
    command: 'node',
    args: ['/home/mhylle/projects/mhmanus/mcp-servers/dist/postgres/index.js'],
    transport: 'stdio',
    env: {
      POSTGRES_URL: process.env.POSTGRES_URL || '',
    },
    permissions: [
      ToolPermission.DatabaseRead,
      ToolPermission.DatabaseWrite,
    ],
    autoStart: false,
  },
  
  sqlite: {
    name: 'sqlite',
    command: 'python',
    args: ['-m', 'mcp_server_sqlite'],
    transport: 'stdio',
    permissions: [
      ToolPermission.DatabaseRead,
      ToolPermission.DatabaseWrite,
    ],
    autoStart: false,
  },
  
  fetch: {
    name: 'fetch',
    command: 'python3',
    args: ['-m', 'mcp_server_fetch'],
    transport: 'stdio',
    env: {
      PYTHONPATH: '/home/mhylle/projects/mhmanus/mcp-servers/src/fetch/src',
    },
    permissions: [
      ToolPermission.NetworkAccess,
    ],
    autoStart: false, // Requires Python dependencies
  },
  
  puppeteer: {
    name: 'puppeteer',
    command: 'node',
    args: ['/home/mhylle/projects/mhmanus/mcp-servers/dist/puppeteer/index.js'],
    transport: 'stdio',
    permissions: [
      ToolPermission.BrowserControl,
      ToolPermission.NetworkAccess,
    ],
    autoStart: false,
  },
  
  memory: {
    name: 'memory',
    command: 'node',
    args: ['/mcp-servers/src/memory/dist/index.js'],
    transport: 'stdio',
    permissions: [],
    autoStart: false, // Disable for now
  },
};

// Helper to get server config by permission
export function getServersByPermission(permission: ToolPermission): string[] {
  return Object.entries(MCP_SERVERS)
    .filter(([_, config]) => config.permissions.includes(permission))
    .map(([name, _]) => name);
}

// Helper to get all available servers
export function getAllServers(): string[] {
  return Object.keys(MCP_SERVERS);
}