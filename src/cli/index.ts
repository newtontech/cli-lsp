#!/usr/bin/env node
import { Command } from 'commander';
import { CLILSPServer } from '../server/index';
import { ToolRegistry } from '../registry/manager';
import chalk from 'chalk';

const program = new Command();

program
  .name('cli-lsp')
  .description('LSP interface for CLI tools')
  .version('0.1.0');

// Start server
program
  .command('serve')
  .description('Start the CLI-LSP server')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('-h, --host <string>', 'Server host', 'localhost')
  .action(async (options) => {
    const server = new CLILSPServer({
      port: parseInt(options.port),
      host: options.host
    });

    console.log(chalk.green('🚀 Starting CLI-LSP Server...'));
    await server.start();
  });

// Register tool
program
  .command('register <name>')
  .description('Register a CLI tool')
  .option('-c, --command <string>', 'CLI command')
  .option('-s, --schema <string>', 'Path to schema JSON file')
  .action(async (name, options) => {
    const registry = new ToolRegistry();

    if (!options.command) {
      console.error(chalk.red('Error: --command is required'));
      process.exit(1);
    }

    if (!options.schema) {
      console.error(chalk.red('Error: --schema is required'));
      process.exit(1);
    }

    try {
      await registry.register(name, options.command, options.schema);
      console.log(chalk.green(`✅ Tool '${name}' registered successfully`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// List tools
program
  .command('list')
  .description('List registered tools')
  .action(async () => {
    const registry = new ToolRegistry();
    const tools = await registry.list();

    if (tools.length === 0) {
      console.log(chalk.yellow('No tools registered'));
      return;
    }

    console.log(chalk.blue.bold('\n📦 Registered Tools:\n'));
    tools.forEach(tool => {
      console.log(chalk.green(`  ${tool.name}`) + chalk.gray(` - ${tool.description}`));
      console.log(chalk.gray(`    Command: ${tool.command}`));
      console.log();
    });
  });

// Validate parameters
program
  .command('validate <tool> <command>')
  .description('Validate parameters for a command')
  .option('-p, --params <json>', 'JSON string of parameters')
  .action(async (tool, command, options) => {
    const { SchemaValidator } = await import('../schema/validator');
    const validator = new SchemaValidator();

    let params = {};
    if (options.params) {
      try {
        params = JSON.parse(options.params);
      } catch (error) {
        console.error(chalk.red('Error: Invalid JSON for params'));
        process.exit(1);
      }
    }

    const result = await validator.validate(tool, command, params);

    if (result.valid) {
      console.log(chalk.green('✅ Parameters are valid'));
    } else {
      console.log(chalk.red('❌ Validation failed:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`  - ${error.param}: ${error.message}`));
      });
      process.exit(1);
    }
  });

// Generate schema
program
  .command('generate')
  .description('Generate schema from --help output')
  .option('--from-help <command>', 'Command to extract help from')
  .option('--output <file>', 'Output file', 'schema.json')
  .action(async (options) => {
    console.log(chalk.yellow('⚠️  Schema generation from --help is not yet implemented'));
    console.log(chalk.gray('This feature will parse --help output and generate a schema.json'));
  });

program.parse();
