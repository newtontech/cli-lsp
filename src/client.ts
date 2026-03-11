/**
 * CLI-LSP Client
 * 
 * Simple client for interacting with CLI-LSP server
 */

export interface CLILSPClientOptions {
  baseUrl?: string;
}

export class CLILSPClient {
  private baseUrl: string;

  constructor(options: CLILSPClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
  }

  async getSchema(tool: string, command?: string): Promise<any> {
    const url = command
      ? `${this.baseUrl}/schema/${tool}/${command}`
      : `${this.baseUrl}/schema/${tool}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get schema: ${response.statusText}`);
    }

    return response.json();
  }

  async validate(tool: string, command: string, params: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, command, params })
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompletions(command: string, subcommand: string, prefix: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/completionItem/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, subcommand, prefix })
    });

    if (!response.ok) {
      throw new Error(`Failed to get completions: ${response.statusText}`);
    }

    return response.json();
  }

  async getHover(command: string, position?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/textDocument/hover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, position })
    });

    if (!response.ok) {
      throw new Error(`Failed to get hover: ${response.statusText}`);
    }

    return response.json();
  }

  async registerTool(name: string, command: string, schema: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, command, schema })
    });

    if (!response.ok) {
      throw new Error(`Failed to register tool: ${response.statusText}`);
    }
  }

  async listTools(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tools`);
    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export for both CommonJS and ES modules
export default CLILSPClient;
