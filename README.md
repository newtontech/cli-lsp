# CLI-LSP: 为 AI 提供命令行工具的 LSP 接口

> **解决痛点**：大语言模型在调用新命令行工具时经常出错，因为没有 LSP 支持，只能靠 `--help` 猜测用法。

## 🎯 核心目标

为所有命令行工具提供统一的 LSP（Language Server Protocol）接口，让 AI 能够：

- ✅ **实时参数验证** - 调用前检查参数类型和格式
- ✅ **自动补全** - 提供命令和参数的自动补全
- ✅ **错误提示** - 立即反馈参数错误
- ✅ **Schema 发现** - 动态获取工具的参数定义
- ✅ **示例代码** - 提供正确的调用示例

## 📋 架构设计

```
┌─────────────┐
│   AI Agent  │
│  (Claude)   │
└──────┬──────┘
       │ LSP Protocol
       ↓
┌─────────────────────┐
│  CLI-LSP Server     │
│  ┌───────────────┐  │
│  │ Tool Registry │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ Schema Store  │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ Validator     │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ↓
    ┌──────────────┐
    │  CLI Tools   │
    │  (openclaw)  │
    └──────────────┘
```

## 🚀 快速开始

### 安装

```bash
npm install -g cli-lsp
```

### 使用

#### 1. 注册 CLI 工具

```bash
# 注册 OpenClaw
cli-lsp register openclaw --command "openclaw" --schema "./schemas/openclaw.json"

# 注册其他工具
cli-lsp register git --command "git" --schema "./schemas/git.json"
```

#### 2. 启动 LSP 服务器

```bash
cli-lsp serve --port 3000
```

#### 3. AI 调用示例

```javascript
// AI 生成代码前先通过 LSP 验证
const lsp = new CLILSP('http://localhost:3000');

// 获取工具 Schema
const schema = await lsp.getSchema('openclaw', 'gateway', 'start');

// 验证参数
const validation = await lsp.validate('openclaw', 'gateway', 'start', {
  port: 3000,
  config: '~/.openclaw/config.json'
});

if (!validation.valid) {
  console.error(validation.errors);
} else {
  // 执行命令
  await exec('openclaw gateway start --port 3000');
}
```

## 📁 项目结构

```
cli-lsp/
├── README.md
├── package.json
├── src/
│   ├── server/           # LSP 服务器
│   │   ├── index.ts
│   │   ├── router.ts
│   │   └── validator.ts
│   ├── registry/         # 工具注册中心
│   │   ├── manager.ts
│   │   └── loader.ts
│   ├── schema/           # Schema 管理
│   │   ├── parser.ts
│   │   ├── generator.ts
│   │   └── validator.ts
│   └── cli/              # 命令行工具
│       ├── index.ts
│       ├── register.ts
│       └── serve.ts
├── schemas/              # 预定义 Schema
│   ├── openclaw.json
│   ├── git.json
│   ├── npm.json
│   └── docker.json
├── examples/             # 使用示例
│   ├── ai-integration/
│   ├── vscode-extension/
│   └── mcp-wrapper/
└── tests/
    ├── unit/
    └── integration/
```

## 🔧 核心功能

### 1. Schema 定义格式

```json
{
  "name": "openclaw",
  "version": "2026.3.8",
  "description": "OpenClaw AI Agent Framework",
  "commands": {
    "gateway": {
      "description": "Manage OpenClaw Gateway service",
      "subcommands": {
        "start": {
          "description": "Start the gateway service",
          "params": {
            "port": {
              "type": "number",
              "default": 3000,
              "description": "Gateway port",
              "validation": "1-65535"
            },
            "config": {
              "type": "string",
              "description": "Path to config file",
              "validation": "file_exists"
            }
          },
          "examples": [
            "openclaw gateway start",
            "openclaw gateway start --port 8080"
          ]
        }
      }
    }
  }
}
```

### 2. LSP 协议支持

#### completionItem/resolve

```json
{
  "method": "completionItem/resolve",
  "params": {
    "command": "openclaw",
    "subcommand": "gateway",
    "prefix": "st"
  }
}
```

**响应**：
```json
{
  "items": [
    {
      "label": "start",
      "kind": "Function",
      "documentation": "Start the gateway service",
      "insertText": "start"
    },
    {
      "label": "status",
      "kind": "Function",
      "documentation": "Check gateway status",
      "insertText": "status"
    },
    {
      "label": "stop",
      "kind": "Function",
      "documentation": "Stop the gateway service",
      "insertText": "stop"
    }
  ]
}
```

#### textDocument/hover

```json
{
  "method": "textDocument/hover",
  "params": {
    "command": "openclaw gateway start",
    "position": { "line": 0, "character": 20 }
  }
}
```

**响应**：
```json
{
  "contents": {
    "kind": "markdown",
    "value": "## openclaw gateway start\n\nStart the gateway service.\n\n**Parameters:**\n- `--port` (number): Gateway port (default: 3000)\n- `--config` (string): Path to config file\n\n**Examples:**\n```bash\nopenclaw gateway start --port 8080\n```"
  }
}
```

### 3. 动态 Schema 生成

支持从多种来源生成 Schema：

- **从 `--help` 输出解析**
  ```bash
  cli-lsp generate --from-help "openclaw --help" > schemas/openclaw.json
  ```

- **从 JSON Schema 转换**
  ```bash
  cli-lsp generate --from-json-schema ./schema.json > schemas/custom.json
  ```

- **从 TypeScript 类型推断**
  ```bash
  cli-lsp generate --from-ts ./src/cli.ts > schemas/mytool.json
  ```

### 4. 验证器

```typescript
import { CLIValidator } from 'cli-lsp';

const validator = new CLIValidator();

// 验证单个命令
const result = validator.validate({
  tool: 'openclaw',
  command: 'gateway start',
  params: { port: 'abc' } // 错误：应该是 number
});

console.log(result);
// {
//   valid: false,
//   errors: [
//     { param: 'port', message: 'Expected number, got string' }
//   ]
// }
```

## 🌟 使用场景

### 1. AI 编程助手集成

**Claude / GPT-4 集成**：

```javascript
// AI 生成代码前先验证
async function safeExec(tool, command, params) {
  const lsp = new CLILSP();
  
  // 获取 Schema
  const schema = await lsp.getSchema(tool, command);
  
  // 验证参数
  const validation = await lsp.validate(tool, command, params);
  
  if (!validation.valid) {
    throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
  }
  
  // 执行命令
  return exec(`${tool} ${command} ${formatParams(params)}`);
}
```

### 2. VS Code 扩展

**功能**：
- 命令自动补全
- 参数提示
- 错误检查
- 快速修复

### 3. MCP 包装器

将 CLI 工具包装为 MCP 服务器：

```bash
# 自动生成 MCP 服务器
cli-lsp wrap openclaw --output ./mcp-servers/openclaw

# 启动 MCP 服务器
./mcp-servers/openclaw/start.sh
```

## 📊 支持的工具

### 官方支持

| 工具 | Schema | 验证器 | 测试 |
|------|--------|--------|------|
| OpenClaw | ✅ | ✅ | ✅ |
| Git | ✅ | ✅ | ✅ |
| npm | ✅ | ✅ | ✅ |
| Docker | ✅ | ✅ | ✅ |
| kubectl | ✅ | ✅ | ⏳ |

### 社区贡献

欢迎贡献更多工具的 Schema！

## 🔗 集成示例

### 1. OpenClaw 集成

```typescript
import { OpenClaw } from 'openclaw';
import { CLILSP } from 'cli-lsp';

const openclaw = new OpenClaw();
const lsp = new CLILSP();

// AI 调用前自动验证
openclaw.beforeCommand(async (command, params) => {
  const validation = await lsp.validate('openclaw', command, params);
  if (!validation.valid) {
    throw new Error(validation.errors);
  }
});
```

### 2. Claude Code 集成

```javascript
// 在 Claude Code 中使用
const cliLSP = require('cli-lsp');

// 注册工具
cliLSP.register({
  name: 'openclaw',
  command: 'openclaw',
  schema: require('./schemas/openclaw.json')
});

// Claude 调用时会自动验证
```

## 🧪 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run coverage

# 集成测试
npm run test:integration
```

## 📈 路线图

### Phase 1: MVP（2 周）
- ✅ LSP 服务器基础框架
- ✅ Schema 定义格式
- ✅ 参数验证器
- ✅ OpenClaw 支持

### Phase 2: 扩展（1 个月）
- ⏳ 更多工具支持（Git, npm, Docker）
- ⏳ 动态 Schema 生成
- ⏳ VS Code 扩展

### Phase 3: 生态（3 个月）
- ⏳ MCP 包装器
- ⏳ 社区 Schema 仓库
- ⏳ AI 平台集成

### Phase 4: 标准化（6 个月）
- ⏳ CLI-LSP RFC 提案
- ⏳ 行业标准制定
- ⏳ 主流工具官方支持

## 🤝 贡献

欢迎贡献！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 贡献 Schema

```bash
# 创建新的 Schema
cp schemas/template.json schemas/mytool.json

# 编辑 Schema
vim schemas/mytool.json

# 验证 Schema
cli-lsp validate-schema schemas/mytool.json

# 提交 PR
```

## 📄 许可证

MIT License

## 🙏 致谢

- 受到 LSP (Language Server Protocol) 启发
- MCP (Model Context Protocol) 提供了很好的参考
- OpenClaw 项目提供了实际需求场景

---

**关键词**：CLI, LSP, AI, 大语言模型, 参数验证, 自动补全, OpenClaw

**Stars** ⭐ 如果这个项目对你有帮助！

**Issues** 🐛 发现问题？[提交 Issue](https://github.com/newtontech/cli-lsp/issues)

**Discussions** 💬 [参与讨论](https://github.com/newtontech/cli-lsp/discussions)
