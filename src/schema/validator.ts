import { ToolRegistry, ParamSchema } from '../registry/manager';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    param: string;
    message: string;
    value?: any;
  }>;
}

export class SchemaValidator {
  private registry: ToolRegistry;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || new ToolRegistry();
  }

  async validate(tool: string, command: string, params: Record<string, any>): Promise<ValidationResult> {
    const schema = await this.registry.getSchema(tool, command) as any;

    if (!schema) {
      return {
        valid: false,
        errors: [{ param: '', message: `Schema not found for ${tool} ${command}` }]
      };
    }

    const errors: ValidationResult['errors'] = [];

    // Check required params
    if (schema.params) {
      for (const [paramName, paramSchema] of Object.entries(schema.params)) {
        const ps = paramSchema as ParamSchema;

        // Check required
        if (ps.required && !(paramName in params)) {
          errors.push({
            param: paramName,
            message: `Required parameter '${paramName}' is missing`,
            value: undefined
          });
          continue;
        }

        // Skip validation if param not provided and has default
        if (!(paramName in params) && ps.default !== undefined) {
          continue;
        }

        // Validate type
        if (paramName in params) {
          const value = params[paramName];
          const typeError = this.validateType(paramName, value, ps);
          if (typeError) {
            errors.push(typeError);
            continue;
          }

          // Validate custom rules
          const customError = this.validateCustomRules(paramName, value, ps);
          if (customError) {
            errors.push(customError);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateType(paramName: string, value: any, schema: ParamSchema): ValidationResult['errors'][0] | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (schema.type === 'any') {
      return null;
    }

    if (schema.type !== actualType) {
      return {
        param: paramName,
        message: `Expected type '${schema.type}', got '${actualType}'`,
        value
      };
    }

    return null;
  }

  private validateCustomRules(paramName: string, value: any, schema: ParamSchema): ValidationResult['errors'][0] | null {
    if (!schema.validation) {
      return null;
    }

    const validation = schema.validation;

    // Number validation
    if (schema.type === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return {
          param: paramName,
          message: `Value ${value} is less than minimum ${validation.min}`,
          value
        };
      }

      if (validation.max !== undefined && value > validation.max) {
        return {
          param: paramName,
          message: `Value ${value} is greater than maximum ${validation.max}`,
          value
        };
      }
    }

    // String validation
    if (schema.type === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        return {
          param: paramName,
          message: `String length ${value.length} is less than minimum ${validation.minLength}`,
          value
        };
      }

      if (validation.pattern !== undefined) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return {
            param: paramName,
            message: `Value '${value}' does not match pattern ${validation.pattern}`,
            value
          };
        }
      }
    }

    // File exists check
    if (validation.check === 'file_exists') {
      const fs = require('fs');
      const expandedPath = value.replace('~', process.env.HOME || '');
      if (!fs.existsSync(expandedPath)) {
        return {
          param: paramName,
          message: `File not found: ${value}`,
          value
        };
      }
    }

    return null;
  }
}
