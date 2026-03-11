/**
 * AI Integration Example
 * 
 * This example shows how to use CLI-LSP with AI agents (Claude, GPT-4, etc.)
 */

import { CLILSPClient } from '../../src/client';

// Example 1: Safe command execution with AI
async function safeAIExecution() {
  const client = new CLILSPClient('http://localhost:3000');

  // AI wants to execute: openclaw gateway start --port 3000
  const tool = 'openclaw';
  const command = 'gateway start';
  const params = { port: 3000 };

  // Step 1: Get schema
  const schema = await client.getSchema(tool, command);
  console.log('Schema:', schema);

  // Step 2: Validate parameters
  const validation = await client.validate(tool, command, params);
  
  if (!validation.valid) {
    console.error('❌ Invalid parameters:', validation.errors);
    return;
  }

  console.log('✅ Parameters are valid');

  // Step 3: Execute command (AI would do this)
  console.log(`Executing: ${tool} ${command} --port ${params.port}`);
}

// Example 2: Claude Code integration
async function claudeCodeIntegration() {
  const client = new CLILSPClient('http://localhost:3000');

  // Claude Code wrapper
  async function claudeExec(command: string) {
    const parts = command.split(' ');
    const tool = parts[0];
    const cmd = parts.slice(1, -1).join(' ');
    const params = parseParams(parts.slice(-1));

    // Validate before execution
    const validation = await client.validate(tool, cmd, params);
    
    if (!validation.valid) {
      throw new Error(`Invalid command: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Execute
    return executeCommand(command);
  }

  // Usage
  try {
    await claudeExec('openclaw gateway start --port 3000');
  } catch (error) {
    console.error('Command failed:', error);
  }
}

// Example 3: Auto-correction
async function autoCorrection() {
  const client = new CLILSPClient('http://localhost:3000');

  // AI provides incorrect parameters
  const wrongParams = { port: 'abc' }; // Should be number

  const validation = await client.validate('openclaw', 'gateway start', wrongParams);

  if (!validation.valid) {
    console.log('⚠️  AI provided invalid parameters, auto-correcting...');
    
    // Auto-correct based on schema
    const schema = await client.getSchema('openclaw', 'gateway start') as any;
    const correctedParams = { ...wrongParams };

    // Apply defaults
    for (const [key, param] of Object.entries(schema.params)) {
      if (!(key in correctedParams) && (param as any).default !== undefined) {
        correctedParams[key] = (param as any).default;
      }
    }

    console.log('Corrected params:', correctedParams);
  }
}

// Example 4: Intelligent suggestions
async function intelligentSuggestions() {
  const client = new CLILSPClient('http://localhost:3000');

  // Get completions for partial command
  const completions = await client.getCompletions('openclaw', 'gateway', 'st');

  console.log('Completions:', completions);
  // Output:
  // [
  //   { label: 'start', documentation: 'Start the gateway service' },
  //   { label: 'status', documentation: 'Check gateway status' },
  //   { label: 'stop', documentation: 'Stop the gateway service' }
  // ]

  // Get hover information
  const hover = await client.getHover('openclaw gateway start');
  console.log('Documentation:', hover);
}

// Helper functions
function parseParams(args: string[]): Record<string, any> {
  const params: Record<string, any> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = value;
      if (value !== true) i++;
    }
  }

  return params;
}

async function executeCommand(command: string): Promise<string> {
  const { exec } = require('child_process');
  return new Promise((resolve, reject) => {
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

// Run examples
if (require.main === module) {
  safeAIExecution().catch(console.error);
}
