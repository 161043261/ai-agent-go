# RAG 模块 (common/rag/)

## 1. 模块概述

RAG（Retrieval-Augmented Generation）模块实现了基于向量检索的知识增强生成功能，使用 Redis 作为向量存储。

## 2. 文件结构

```
common/rag/
└── rag.go    # RAG 索引和检索实现
```

## 3. 核心结构体

### 3.1 RAGIndexer - 文档索引器

```go
type RAGIndexer struct {
    embedding embedding.Embedder     // 向量生成器
    indexer   *redisIndexer.Indexer  // Redis 索引器
}
```

### 3.2 RAGQuery - 文档查询器

```go
type RAGQuery struct {
    embedding embedding.Embedder        // 向量生成器
    retriever retriever.Retriever       // 向量检索器
}
```

## 4. 主要函数

### 4.1 索引操作

```go
// 创建索引器
func NewRAGIndexer(filename, embeddingModel string) (*RAGIndexer, error)

// 索引文件
func (r *RAGIndexer) IndexFile(ctx context.Context, filePath string) error

// 删除索引
func DeleteIndex(ctx context.Context, filename string) error
```

### 4.2 查询操作

```go
// 创建查询器
func NewRAGQuery(ctx context.Context, username string) (*RAGQuery, error)

// 检索相关文档
func (r *RAGQuery) RetrieveDocuments(ctx context.Context, query string) ([]*schema.Document, error)

// 构建 RAG 提示词
func BuildRAGPrompt(query string, docs []*schema.Document) string
```

## 5. 工作流程

### 5.1 索引流程

```
上传文件
    │
    ▼
NewRAGIndexer(filename, model)
    │
    ├── 创建 OpenAI Embedding 客户端
    │
    └── 创建 Redis Indexer
    │
    ▼
IndexFile(ctx, filePath)
    │
    ├── 读取文件内容
    │
    ├── 调用 Embedding API 生成向量
    │
    └── 存储到 Redis (HSET + 向量索引)
```

### 5.2 查询流程

```
用户问题
    │
    ▼
NewRAGQuery(ctx, username)
    │
    ▼
RetrieveDocuments(ctx, query)
    │
    ├── 问题向量化
    │
    ├── Redis 向量相似度搜索
    │
    └── 返回 Top-K 相关文档
    │
    ▼
BuildRAGPrompt(query, docs)
    │
    ├── 拼接上下文
    │
    └── 生成完整提示词
    │
    ▼
LLM 生成回答
```

## 6. Redis 向量索引结构

```
# 索引创建
FT.CREATE rag_docs:<username>:idx
    ON HASH
    PREFIX 1 rag_docs:<username>:
    SCHEMA
        content TEXT
        metadata TEXT
        vector VECTOR FLAT 6 TYPE FLOAT32 DIM 1024 DISTANCE_METRIC COSINE

# 数据存储
HSET rag_docs:<username>:<doc_id>
    content "文档内容..."
    metadata "{...}"
    vector <binary_vector>
```

## 7. 提示词模板

```go
func BuildRAGPrompt(query string, docs []*schema.Document) string {
    // 拼接上下文
    context := ""
    for _, doc := range docs {
        context += doc.Content + "\n"
    }
    
    return fmt.Sprintf(`基于以下上下文回答问题：

上下文：
%s

问题：%s

请基于上下文信息回答，如果上下文中没有相关信息，请说明。`, context, query)
}
```

## 8. 依赖关系

```
common/rag/
    ├── → config          (RAG 配置)
    ├── → common/redis    (Redis 客户端)
    └── → cloudwego/eino  (RAG 组件)
```

## 9. 注意事项

1. **向量维度**: 需与 Embedding 模型输出维度一致（默认 1024）
2. **Redis 版本**: 需要 Redis Stack 或 RedisSearch 模块
3. **文件格式**: 支持 .md 和 .txt 文件
4. **索引覆盖**: 上传新文件会删除旧索引
