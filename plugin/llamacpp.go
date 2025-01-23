package plugin

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"
)

const API_URL = "http://127.0.0.1:8080"

type HealthResponse struct {
	Status string `json:"status"`
}

var ModelName string

type PropsResponse struct {
	DefaultGenerationSettings struct {
		Model string `json:"model"`
	} `json:"default_generation_settings"`
}

func doHTTPGet(url string, timeout time.Duration, target interface{}) (int, error) {
	client := http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, err
	}
	if target != nil {
		if err := json.Unmarshal(body, target); err != nil {
			return resp.StatusCode, err
		}
	}
	return resp.StatusCode, nil
}

func LlamaHealthCheck() bool {
	statusCode, err := doHTTPGet(API_URL+"/health", 5*time.Second, &HealthResponse{})
	if err != nil {
		log.Printf("Llama-server: %v", err)
		return false
	}
	return statusCode == http.StatusOK
}

func init() {
	if !LlamaHealthCheck() {
		log.Fatal("Llama-server is not running")
	} else {
		log.Println("Llama-server is running")
	}
}
