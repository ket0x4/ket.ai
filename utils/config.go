package utils

import (
	"encoding/json"
	"io"
	"log"
	"os"
)

type Config struct {
	BOT_TOKEN               string  `json:"token"`
	ADMIN_IDS               []int64 `json:"admins"`
	ALLOWED_CHAT_IDS        []int64 `json:"allowed_chats"`
	LLAMA_CPP_API_URL       string  `json:"lcpp_api_url"`
	LLAMA_CPP_DEFAULT_MODEL string  `json:"lcpp_model"`
	DUCK_CHAT_DEFAULT_MODEL string  `json:"dc_model"`
	VERSION                 string  `json:"version"`
}

var loadedConfig Config

func parseConfigFile(filePath string) (Config, error) {
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
	c, err := parseConfigFile("config.json")
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}
	loadedConfig = c
	LogConfig()
}

func LogConfig() {
	log.Println("Version:", loadedConfig.VERSION)
	log.Println("Bot Token:", loadedConfig.BOT_TOKEN)
	log.Println("Admins:", loadedConfig.ADMIN_IDS)
	log.Println("Allowed Chats:", loadedConfig.ALLOWED_CHAT_IDS)
	log.Println("llama.cpp API URL:", loadedConfig.LLAMA_CPP_API_URL)
	log.Println("llama.cpp Model:", loadedConfig.LLAMA_CPP_DEFAULT_MODEL)
	log.Println("DuckChat Model:", loadedConfig.DUCK_CHAT_DEFAULT_MODEL)
}

func GetConfig() Config {
	return loadedConfig
}
