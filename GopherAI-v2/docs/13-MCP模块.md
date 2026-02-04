# MCP 模块 (common/mcp/)

## 1. 模块概述

MCP（Model Context Protocol）模块实现了模型上下文协议，支持 AI 模型调用外部工具。

## 2. 文件结构

```
common/mcp/
├── main.go           # MCP 入口（CLI）
├── client/
│   └── client.go     # MCP 客户端
└── server/
    └── server.go     # MCP 服务端
```

## 3. 核心结构体

### 3.1 MCPClient

```go
type MCPClient struct {
    c *client.Client  // MCP 客户端
}
```

### 3.2 WeatherResponse

```go
type WeatherResponse struct {
    Location    string  `json:"location"`
    Temperature float64 `json:"temperature"`
    Condition   string  `json:"condition"`
    Humidity    int     `json:"humidity"`
    WindSpeed   float64 `json:"windSpeed"`
}
```

## 4. 主要函数

### 4.1 客户端

```go
// 创建客户端
func NewMCPClient(httpURL string) (*MCPClient, error)

// 初始化
func (m *MCPClient) Initialize(ctx context.Context) error

// 调用工具
func (m *MCPClient) CallTool(ctx context.Context, toolName string, args map[string]interface{}) (interface{}, error)
```

### 4.2 服务端

```go
// 启动服务器
func StartServer(httpAddr string) error
```

## 5. 提供的工具

| 工具名 | 参数 | 功能 |
|--------|------|------|
| get_weather | city (string) | 获取城市天气信息 |

## 6. 工作流程

```
用户问题（如"北京天气"）
    │
    ▼
MCPModel.GenerateResponse()
    │
    ├── LLM 分析需要调用 get_weather
    │
    ├── MCPClient.CallTool("get_weather", {"city": "北京"})
    │
    ├── MCP Server 处理请求
    │
    └── 返回天气数据
    │
    ▼
LLM 整合工具结果生成回答
```

## 7. 服务端实现

```go
// 注册工具
mcpServer.AddTool(mcp.Tool{
    Name:        "get_weather",
    Description: "获取指定城市的天气信息",
    InputSchema: mcp.ToolInputSchema{
        Type: "object",
        Properties: map[string]interface{}{
            "city": map[string]interface{}{
                "type":        "string",
                "description": "城市名称",
            },
        },
        Required: []string{"city"},
    },
}, handleGetWeather)
```

## 8. 依赖关系

```
common/mcp/
    └── → mark3labs/mcp-go  (MCP SDK)
```

## 9. 注意事项

1. **服务部署**: MCP Server 需要独立部署
2. **工具扩展**: 可通过添加 Tool 扩展功能
3. **超时设置**: 工具调用需设置合理超时
