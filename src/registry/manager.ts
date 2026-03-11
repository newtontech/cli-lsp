import * as fs from 'fs';
import * as path from 'path';

export interface ToolSchema {
  name: string;
  version: string;
  description: string;
  repository?: string;
  commands: {
    [command: string]: CommandSchema;
  };
  metadata?: any;
}

export interface CommandSchema {
  description: string;
  params?: {
    [param: string]: ParamSchema;
  };
  subcommands?: {
    [subcommand: string]: CommandSchema;
  };
  examples?: Array<{
    command: string;
    description: string;
  }>;
}

export interface ParamSchema {
  type: string;
  required?: boolean;
  default?: any;
  description: string;
  validation?: any;
}

export class ToolRegistry {
  private tools: Map<string, { command: string; schema: ToolSchema }> = new Map();

  async register(name: string, command: string, schema: ToolSchema | string) {
    let schemaObj: ToolSchema;

    if (typeof schema === 'string') {
      // Load from file
      const schemaPath = path.resolve(schema);
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }
      schemaObj = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    } else {
      schemaObj = schema;
    }

    this.tools.set(name, { command, schema: schemaObj });
  }

  async getSchema(tool: string, command?: string): Promise<CommandSchema | ToolSchema | null> {
    const toolData = this.tools.get(tool);
    if (!toolData) {
      return null;
    }

    if (!command) {
      return toolData.schema;
    }

    // Parse command path (e.g., "gateway start")
    const parts = command.split(' ');
    let current: any = toolData.schema.commands;

    for (const part of parts) {
      if (current[part]) {
        if (current[part].subcommands) {
          current = current[part].subcommands;
        } else {
          return current[part];
        }
      } else {
        return null;
      }
    }

    return current;
  }

  async list(): Promise<Array<{ name: string; command: string; description: string }>> {
    return Array.from(this.tools.entries()).map(([name, data]) => ({
      name,
      command: data.command,
      description: data.schema.description
    }));
  }

  async unregister(name: string) {
    this.tools.delete(name);
  }
}
