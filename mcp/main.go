package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	mcp "mcp/src"
)

func main() {
	// Define command-line flags
	mode := flag.String("mode", "", "Run mode: server or client")
	httpAddr := flag.String("http-addr", ":8081", "Http server address")
	city := flag.String("city", "", "City name for weather query")
	flag.Parse()

	if *mode == "" {
		fmt.Println("Error: mode is required, use --mode (server or client)")
		flag.Usage()
		os.Exit(1)
	}

	switch *mode {
	case "server":
		{
			// Start server
			fmt.Println("Starting mcp server...")
			if err := mcp.StartServer(*httpAddr); err != nil {
				log.Fatalf("Server error: %v", err)
			}
		}
	case "client":
		{
			// Run client
			if *city == "" {
				fmt.Println("Error: city is required, use --city")
				flag.Usage()
				os.Exit(1)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			// Create client
			httpURL := "http://localhost:8081/mcp"
			mcpClient, err := mcp.NewMcpClient(httpURL)
			if err != nil {
				log.Fatalf("Create client error: %v", err)
			}
			defer mcpClient.Close()
			// Initialize client
			if _, err := mcpClient.Init(ctx); err != nil {
				log.Fatalf("Initialization client error: %v", err)
			}
			// Perform health check
			if err := mcpClient.Ping(ctx); err != nil {
				log.Fatalf("Health check error: %v", err)
			}
			// Call weather tool
			result, err := mcpClient.CallWeatherTool(ctx, *city)
			if err != nil {
				log.Fatalf("Call tool error: %v", err)
			}
			// Display weather result
			fmt.Println("Weather query result:")
			fmt.Println(mcpClient.GetToolResultText(result))
			fmt.Println("Client initialized successfully, shutting down...")
		}
	}
}
