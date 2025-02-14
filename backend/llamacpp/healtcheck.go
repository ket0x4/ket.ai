package backend

import (
	"encoding/json"
	"io"
	"ket/utils"
	"log"
	"net/http"
	"time"
)

type HealthResponse struct{} // to-do: define the response

var ModelName string

type PropsResponse struct {
	DefaultGenerationSettings struct {
		Model string `json:"model"`
	} `json:"default_generation_settings"`
}

func LlamaHealthCheck() bool {
	url := utils.GetConfig().LLAMA_CPP_API_URL + "/health"

	client := http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("Llama-server: %v", err)
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Llama-server: %v", err)
		return false
	}

	if resp.StatusCode == 200 {
		var response HealthResponse
		if err := json.Unmarshal(body, &response); err != nil {
			//log.Printf("Llama-server: JSON parsing error: %v", err)
			return false
		}
		//log.Printf("Llama-server:: %v", response)
		return true
	} else {
		//log.Printf("Llama-server: Unexpected status code: %d, response: %s", resp.StatusCode, body)
		return false
	}
}
