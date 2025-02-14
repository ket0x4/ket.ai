package backend

import (
	"encoding/json"
	"io"
	"ket/utils"
	"log"
	"net/http"
	"time"
)

// Get the model name from the llama-server
func LlamaProps() bool {
	if LlamaHealthCheck() {
		url := utils.GetConfig().LLAMA_CPP_API_URL + "/props"
		client := http.Client{
			Timeout: 5 * time.Second,
		}

		resp, err := client.Get(url)
		if err != nil {
			log.Printf("Llama-server: %v", err)
			ModelName = "Error"
			return false
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Llama-server: %v", err)
			ModelName = "Error"
			return false
		}

		if resp.StatusCode == 200 {
			var props PropsResponse
			if err := json.Unmarshal(body, &props); err != nil {
				log.Printf("Llama-server: JSON parsing error: %v", err)
				ModelName = "Error"
				return false
			}
			ModelName = props.DefaultGenerationSettings.Model
			log.Printf("Llama-server Loaded LLM Model: %s", ModelName)
			return true
		} else {
			log.Printf("Llama-server: Unexpected status code: %d, response: %s", resp.StatusCode, body)
			ModelName = "Error"
			return false
		}
	} else {
		log.Println("Llama-server: Error loading LLM Model")
		ModelName = "Error"
		return false
	}
}
