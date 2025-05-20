declare module '@modelcontextprotocol/sdk' {
  export interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    handler?: (params: Record<string, any>, extra?: Record<string, any>) => Promise<any>;
  }
  
  export interface McpServer {
    tool: (
      name: string, 
      description: string, 
      parameters: Record<string, any>, 
      handler: (params: Record<string, any>, extra?: Record<string, any>) => Promise<any>
    ) => void;
  }
  
  export interface CallToolResult {
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    _meta?: Record<string, unknown>;
    isError?: boolean;
    [key: string]: unknown;
  }

  // Add any other types your app needs from the SDK
}
