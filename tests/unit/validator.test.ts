import { ToolRegistry } from '../src/registry/manager';
import { SchemaValidator } from '../src/schema/validator';
import * as path from 'path';

describe('SchemaValidator', () => {
  let registry: ToolRegistry;
  let validator: SchemaValidator;

  beforeEach(async () => {
    registry = new ToolRegistry();
    validator = new SchemaValidator(registry);

    // Register OpenClaw schema
    const schemaPath = path.join(__dirname, '../schemas/openclaw.json');
    await registry.register('openclaw', 'openclaw', schemaPath);
  });

  test('should validate correct parameters', async () => {
    const result = await validator.validate('openclaw', 'gateway start', {
      port: 3000
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect type mismatch', async () => {
    const result = await validator.validate('openclaw', 'gateway start', {
      port: 'abc' // Should be number
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].param).toBe('port');
    expect(result.errors[0].message).toContain('Expected type \'number\'');
  });

  test('should detect missing required parameter', async () => {
    const result = await validator.validate('openclaw', 'plugins install', {
      // Missing required 'name' parameter
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Required parameter');
  });

  test('should validate number range', async () => {
    const result = await validator.validate('openclaw', 'gateway start', {
      port: 70000 // Out of range (1-65535)
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('greater than maximum');
  });

  test('should accept default values', async () => {
    const result = await validator.validate('openclaw', 'gateway start', {
      // No port provided, should use default
    });

    expect(result.valid).toBe(true);
  });
});
