/**
 * CLI-LSP: LSP interface for CLI tools
 * 
 * Making AI agents call commands correctly
 */

export { CLILSPServer } from './server/index';
export { CLILSPClient } from './client';
export { ToolRegistry } from './registry/manager';
export { SchemaValidator } from './schema/validator';

export type { ToolSchema, CommandSchema, ParamSchema } from './registry/manager';
export type { ValidationResult } from './schema/validator';
