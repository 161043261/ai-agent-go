# AI-JS
```bash
pnpm exec prisma generate 
```
GopherAI 的 JavaScript/TypeScript 重构版本 - AI 聊天平台

## 技术栈

| 模块 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 语言 | TypeScript 5.x |
| Web 框架 | Fastify 4.x |
| ORM | Prisma 5.x |
| 数据库 | MySQL |
| 缓存 | ioredis / node-cache |
| JWT | @fastify/jwt |
| AI 模型 | OpenAI SDK |
| 图像识别 | onnxruntime-node |

## 项目结构

```
ai-js/
├── src/
│   ├── index.ts              # 应用入口
│   ├── app.ts                # Fastify 应用配置
│   ├── config/               # 配置管理
│   ├── routes/               # 路由定义
│   ├── controllers/          # 控制器
│   ├── services/             # 服务层
│   ├── repositories/         # 数据访问层
│   ├── middleware/           # 中间件
│   ├── lib/                  # 核心库
│   │   ├── ai/               # AI 助手模块
│   │   ├── cache/            # 缓存模块
│   │   └── image/            # 图像识别
│   ├── utils/                # 工具函数
│   └── types/                # 类型定义
├── prisma/
│   └── schema.prisma         # 数据库模型
├── .env.example              # 环境变量示例
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
cd ai-js
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis、API Key 等
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 同步数据库结构
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
npm start
```

## API 接口

### 用户认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/user/register` | 用户注册 |
| POST | `/api/v1/user/login` | 用户登录 |

### AI 聊天

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/AI/chat/sessions` | 获取会话列表 |
| POST | `/api/v1/AI/chat/send-new-session` | 创建新会话并发送 |
| POST | `/api/v1/AI/chat/send` | 发送消息 |
| POST | `/api/v1/AI/chat/send-stream-new-session` | 创建新会话并流式发送 |
| POST | `/api/v1/AI/chat/send-stream` | 流式发送消息 |
| POST | `/api/v1/AI/chat/history` | 获取聊天历史 |

### 文件上传

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/file/upload` | 上传 RAG 文件 |
| GET | `/api/v1/file/list` | 获取文件列表 |

### 图像识别

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/image/recognize` | 图像分类识别 |

## AI 模型类型

通过 `modelType` 参数选择不同的 AI 模型：

| 类型 | 说明 |
|------|------|
| `1` | OpenAI 兼容模型（默认） |
| `2` | RAG 增强模型（带向量检索） |
| `3` | MCP 工具调用模型 |
| `4` | Ollama 本地模型 |

## 环境变量说明

```env
# 服务器配置
HOST=0.0.0.0
PORT=9090

# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/dbname"

# Redis（可选）
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8760h

# OpenAI API
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 图像识别（可选）
IMAGE_ENABLED=true
IMAGE_MODEL_PATH=./models/mobilenetv2-7.onnx
IMAGE_LABEL_PATH=./models/synset.txt
```

## 与 Go 版本的功能对应

| Go 版本功能 | JS 版本实现 |
|------------|------------|
| Gin Web 框架 | Fastify |
| GORM | Prisma |
| go-redis | ioredis |
| BigCache | node-cache |
| golang-jwt | @fastify/jwt |
| cloudwego/eino | OpenAI SDK |
| onnxruntime_go | onnxruntime-node |

## License

MIT
