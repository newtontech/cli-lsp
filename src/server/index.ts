import express, { Request, Response } from 'express';
import { CLILSPServer } from './server';
import { ToolRegistry } from '../registry/manager';
import { SchemaValidator } from '../schema/validator';

export interface CLIServerOptions {
  port?: number;
  host?: string;
}

export class CLILSPServer {
  private app = express();
  private registry: ToolRegistry;
  private validator: SchemaValidator;
  private port: number;
  private host: string;

  constructor(options: CLIServerOptions = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.registry = new ToolRegistry();
    this.validator = new SchemaValidator();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // LSP Protocol: completionItem/resolve
    this.app.post('/completionItem/resolve', async (req: Request, res: Response) => {
      try {
        const { command, subcommand, prefix } = req.body;
        const completions = await this.getCompletions(command, subcommand, prefix);
        res.json({ items: completions });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // LSP Protocol: textDocument/hover
    this.app.post('/textDocument/hover', async (req: Request, res: Response) => {
      try {
        const { command, position } = req.body;
        const hover = await this.getHover(command, position);
        res.json(hover);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get schema
    this.app.get('/schema/:tool/:command?', async (req: Request, res: Response) => {
      try {
        const { tool, command } = req.params;
        const schema = await this.registry.getSchema(tool, command);
        res.json(schema);
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });

    // Validate parameters
    this.app.post('/validate', async (req: Request, res: Response) => {
      try {
        const { tool, command, params } = req.body;
        const result = await this.validator.validate(tool, command, params);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Register tool
    this.app.post('/register', async (req: Request, res: Response) => {
      try {
        const { name, command, schema } = req.body;
        await this.registry.register(name, command, schema);
        res.json({ success: true, message: `Tool ${name} registered successfully` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // List tools
    this.app.get('/tools', async (req: Request, res: Response) => {
      try {
        const tools = await this.registry.list();
        res.json(tools);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private async getCompletions(command: string, subcommand: string, prefix: string) {
    const schema = await this.registry.getSchema(command, subcommand);
    
    if (!schema || !schema.subcommands) {
      return [];
    }

    const completions = Object.keys(schema.subcommands)
      .filter(name => name.startsWith(prefix))
      .map(name => ({
        label: name,
        kind: 'Function',
        documentation: schema.subcommands[name].description,
        insertText: name
      }));

    return completions;
  }

  private async getHover(command: string, position: any) {
    const parts = command.split(' ');
    const tool = parts[0];
    const cmd = parts.slice(1).join(' ');

    const schema = await this.registry.getSchema(tool, cmd);

    if (!schema) {
      return { contents: '' };
    }

    let markdown = `## ${command}\n\n`;
    markdown += `${schema.description || ''}\n\n`;

    if (schema.params && Object.keys(schema.params).length > 0) {
      markdown += '**Parameters:**\n';
      for (const [key, param] of Object.entries(schema.params)) {
        markdown += `- \`${key}\` (${(param as any).type}): ${(param as any).description}`;
        if ((param as any).default !== undefined) {
          markdown += ` (default: ${(param as any).default})`;
        }
        markdown += '\n';
      }
    }

    if (schema.examples && schema.examples.length > 0) {
      markdown += '\n**Examples:**\n```bash\n';
      schema.examples.forEach((example: any) => {
        markdown += `${example.command}\n`;
      });
      markdown += '```\n';
    }

    return {
      contents: {
        kind: 'markdown',
        value: markdown
      }
    };
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.app.listen(this.port, this.host, () => {
        console.log(`CLI-LSP Server running at http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }
}

// CLI entry point
if (require.main === module) {
  const server = new CLILSPServer({ port: 3000 });
  server.start().catch(console.error);
}
