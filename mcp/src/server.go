package src

// get-weather
import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

type WttrResponse struct {
	CurrentCondition []struct {
		TempC         string `json:"temp_C"`
		Humidity      string `json:"humidity"`
		WindspeedKmph string `json:"windspeedKmph"`
		WeatherDesc   []struct {
			Value string `json:"value"`
		} `json:"weatherDesc"`
	} `json:"current_condition"`

	NearestArea []struct {
		AreaName []struct {
			Value string `json:"value"`
		} `json:"areaName"`
	} `json:"nearest_area"`
}

type WeatherResponse struct {
	Location    string  `json:"location"`
	Temperature float64 `json:"temperature"`
	Condition   string  `json:"condition"`
	Humidity    int     `json:"humidity"`
	WindSpeed   float64 `json:"wind_speed"`
}

func GetWeatherFromWttr(ctx context.Context, city string) (*WeatherResponse, error) {
	url := fmt.Sprintf(
		"https://wttr.in/%s?format=j1&lang=zh",
		city,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request error: %v\n", err)
	}
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request error: %v\n", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response error: %v\n", err)
	}
	var wttrResp WttrResponse
	if err := json.Unmarshal(body, &wttrResp); err != nil {
		return nil, fmt.Errorf("json unmarshal error: %v\n", err)
	}
	if len(wttrResp.CurrentCondition) == 0 {
		return nil, fmt.Errorf("weather data empty\n")
	}
	data := wttrResp.CurrentCondition[0]
	temp, _ := strconv.ParseFloat(data.TempC, 64)
	humidity, _ := strconv.Atoi(data.Humidity)
	wind, _ := strconv.ParseFloat(data.WindspeedKmph, 64)
	if len(wttrResp.NearestArea) > 0 &&
		len(wttrResp.NearestArea[0].AreaName) > 0 {
		city = wttrResp.NearestArea[0].AreaName[0].Value
	}
	condition := "unknown"
	if len(data.WeatherDesc) > 0 {
		condition = data.WeatherDesc[0].Value
	}
	return &WeatherResponse{
		Location:    city,
		Temperature: temp,
		Condition:   condition,
		Humidity:    humidity,
		WindSpeed:   wind,
	}, nil
}

func NewMcpServer() *server.MCPServer {
	mcpServer := server.NewMCPServer(
		"get-weather-server",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithLogging(),
	)
	mcpServer.AddTool(
		mcp.NewTool(
			"get-weather",
			mcp.WithDescription("Get weather information for a city"),
			mcp.WithString(
				"city",
				mcp.Description("City name, such as Beijing, Shanghai"),
				mcp.Required(),
			),
		),
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := request.GetArguments()
			city, ok := args["city"].(string)
			if !ok || city == "" {
				return nil, fmt.Errorf("invalid city argument\n")
			}
			weather, err := GetWeatherFromWttr(ctx, city)
			if err != nil {
				return nil, err
			}
			resultText := fmt.Sprintf(
				"location: %s\ntemperature: %.1f°C\ncondition: %s\nhumidity: %d%%\nwind_speed: %.1f km/h",
				weather.Location,
				weather.Temperature,
				weather.Condition,
				weather.Humidity,
				weather.WindSpeed,
			)
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					mcp.TextContent{
						Type: "text",
						Text: resultText,
					},
				},
			}, nil
		},
	)
	return mcpServer
}

func StartServer(httpAddr string) error {
	mcpServer := NewMcpServer()
	httpServer := server.NewStreamableHTTPServer(mcpServer)
	log.Printf("Http mcp server listening on %s/mcp\n", httpAddr)
	return httpServer.Start(httpAddr)
}
