package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/mcp"
)

func BuildFirstMcpPrompt(userMessage string) string {
	return fmt.Sprintf(`
You can use the MCP tool to get information.

Available tools:
- get-weather: Get weather information for a city. Parameters: city (city name, supports Chinese and English, such as Beijing, Shanghai, etc.)

Important rules:
1. If you need to call a tool, you must return the following JSON format:
{
"is_tool_call": true,
"tool_name": "tool name",
"args": {"parameter name": "parameter value"}
}
Example:
{
"is_tool_call": true,
"tool_name": "get-weather",
"args": {"city": "Beijing"}
}
2. If you don't need to call a tool, return a natural language answer.
3. Please decide whether to call a tool based on the user's question.

User question: %s

Please call the appropriate tool as needed, and then give a comprehensive answer.`, userMessage)
}

func BuildSecondMcpPrompt(userMessage string, toolCall *ToolCall, toolResult string) string {
	return fmt.Sprintf(`
You can use the MCP tool to get information.

Tool execution results:
Tool name: %s
Tool parameters: %v
Tool result: %s

User question: %s

Please provide a final, comprehensive answer based on the user's question and the tool results.`, toolCall.ToolName, toolCall.Args, toolResult, userMessage)
}

type ToolCall struct {
	IsToolCall bool           `json:"is_tool_call"`
	ToolName   string         `json:"tool_name"`
	Args       map[string]any `json:"args"`
}

func ParseMcpResponse(response string) (*ToolCall, error) {
	var toolCall ToolCall
	if err := json.Unmarshal([]byte(response), &toolCall); err == nil {
		return &toolCall, nil
	}
	return &ToolCall{IsToolCall: false}, nil
}

func CallMcpTool(ctx context.Context, client *client.Client, toolCall *ToolCall) (string, error) {
	callToolRequest := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      toolCall.ToolName,
			Arguments: toolCall.Args,
		},
	}
	result, err := client.CallTool(ctx, callToolRequest)
	if err != nil {
		return "", fmt.Errorf("mcp tool call error: %v\n", err)
	}
	var content string
	for _, chunk := range result.Content {
		if textChunk, ok := chunk.(mcp.TextContent); ok {
			content += textChunk.Text + "\n"
		}
	}
	return content, nil
}
