package utils

import (
	"encoding/json"
	"io"
	"log"
	"os"
)

type Config struct {
	VERSION                 string  `json:"version"`
	BOT_TOKEN               string  `json:"token"`
	LLAMA_CPP_API_URL       string  `json:"lcpp_api_url"`
	LLAMA_CPP_DEFAULT_MODEL string  `json:"lcpp_model"`
	DUCK_CHAT_DEFAULT_MODEL string  `json:"dc_model"`
	ADMIN_IDS               []int64 `json:"admins"`
	ALLOWED_CHAT_IDS        []int64 `json:"allowed_chats"`
}

var loadedConfig Config

func loadConfig(filePath string) (Config, error) {
	var config Config
	file, err := os.Open(filePath)
	if err != nil {
		return config, err
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		return config, err
	}

	err = json.Unmarshal(bytes, &config)
	if err != nil {
		return config, err
	}

	return config, nil
}

func ReadConfig() {
	c, err := loadConfig("config.json")
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}
	loadedConfig = c

	log.Println("Version:", loadedConfig.VERSION)
	log.Println("Admins:", loadedConfig.ADMIN_IDS)
	log.Println("Allowed Chats:", loadedConfig.ALLOWED_CHAT_IDS)
	log.Println("llama.cpp API URL:", loadedConfig.LLAMA_CPP_API_URL)
	log.Println("llama.cpp Model:", loadedConfig.LLAMA_CPP_DEFAULT_MODEL)
	log.Println("Duck Chat Model:", loadedConfig.DUCK_CHAT_DEFAULT_MODEL)
}

func GetConfig() Config {
	return loadedConfig
}
