export enum ToolCategory {
  FileSystem = 'filesystem',
  VersionControl = 'versionControl',
  PackageManager = 'packageManager',
  Network = 'network',
  Database = 'database',
  Shell = 'shell',
  Analysis = 'analysis',
  Browser = 'browser',
  Communication = 'communication',
}

export enum ToolPermission {
  FileRead = 'file:read',
  FileWrite = 'file:write',
  NetworkAccess = 'network:access',
  DatabaseRead = 'database:read',
  DatabaseWrite = 'database:write',
  ShellExecute = 'shell:execute',
  BrowserControl = 'browser:control',
}

export interface ToolContext {
  agentId: string;
  taskId: string;
  workspace?: string;
  environment?: Record<string, string>;
  timeout?: number;
  permissions: ToolPermission[];
}

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: string[];
  artifacts?: ToolArtifact[];
  usage?: ResourceUsage;
}

export interface ToolArtifact {
  type: 'file' | 'url' | 'data';
  name: string;
  path?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface ResourceUsage {
  duration: number;
  tokens?: number;
  apiCalls?: number;
  dataTransferred?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  permissions: ToolPermission[];
  parameters?: any; // JSON Schema
  returns?: any; // JSON Schema
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  transport: 'stdio' | 'http';
  permissions: ToolPermission[];
  autoStart?: boolean;
}