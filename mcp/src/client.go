package src

// get-weather
import (
	"context"
	"fmt"
	"log"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
)

type McpClient struct {
	c *client.Client
}

func NewMcpClient(url string) (*McpClient, error) {
	log.Println("Initializing http client")
	httpTrans, err := transport.NewStreamableHTTP(url)
	if err != nil {
		return nil, fmt.Errorf("create http transport error: %v\n", err)
	}
	c := client.NewClient(httpTrans)
	return &McpClient{c}, nil
}

func (m *McpClient) Init(ctx context.Context) (*mcp.InitializeResult, error) {
	m.c.OnNotification(func(notification mcp.JSONRPCNotification) {
		log.Printf("Receive notification: %s\n", notification.Method)
	})
	log.Println("Initializing client...")
	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "Weather Mcp Client",
		Version: "1.0.0",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}
	res, err := m.c.Initialize(ctx, initRequest)
	if err != nil {
		return nil, fmt.Errorf("client initialize error: %v\n", err)
	}
	log.Printf("Connect to server: %s (version %s)\n", res.ServerInfo.Name, res.ServerInfo.Version)
	return res, nil
}

func (m *McpClient) Ping(ctx context.Context) error {
	log.Println("Checking health...")
	if err := m.c.Ping(ctx); err != nil {
		return fmt.Errorf("health check error: %sv\n", err)
	}
	log.Println("Health check pass")
	return nil
}

func (m *McpClient) CallWeatherTool(ctx context.Context, city string) (*mcp.CallToolResult, error) {
	log.Printf("Getting the weather for city %s...\n", city)
	callToolRequest := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name: "get-weather",
			Arguments: map[string]any{
				"city": city,
			},
		},
	}
	res, err := m.c.CallTool(ctx, callToolRequest)
	if err != nil {
		return nil, fmt.Errorf("call `get-weather` error: %v\n", err)
	}
	return res, nil
}

func (m *McpClient) GetToolResultText(result *mcp.CallToolResult) string {
	var text string
	for _, content := range result.Content {
		if textContent, ok := content.(mcp.TextContent); ok {
			text += textContent.Text + "\n"
		}
	}
	return text
}

func (m *McpClient) Close() {
	if m.c != nil {
		m.c.Close()
	}
}
