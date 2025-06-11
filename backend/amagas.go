package backend

import (
	"ket/config"
	"log"
	"net/http"
)

var Backend string
var llamaCppHealthCheckURL = "http://127.0.0.1:8080/health"

func init() {
	// Initialize the backend
	log.Println("Backend set to auto-detect mode")
	log.Println("Looking for backend configuration...")
	Backend = config.GetConfig().BACKEND
	if Backend == "" || (Backend == "auto" && Backend != "llama" && Backend != "openai") {
		if IsLlamaCppAvailable() {
			log.Println("Found llama-server up and running at", llamaCppHealthCheckURL)
			// If Llama.cpp is available, set it as the backend
			Backend = "llama"
		} else {
			// If Llama.cpp is not available, default to OpenAI
			log.Println("Unable to find llama-server, Set url and key in config.json")
			log.Println("Falling back to OpenAI backend")
			Backend = "openai"
		}
	}

}

// check if url returns 200 OK
func IsLlamaCppAvailable() bool {
	resp, err := http.Get(llamaCppHealthCheckURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
