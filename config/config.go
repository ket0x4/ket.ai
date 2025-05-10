package config

import (
	"embed"
	"encoding/json"
	"io"
	"log"
	"os"
)

type Config struct {
	TOKEN         string  `json:"token"`
	ADMINS        []int64 `json:"admins"`
	ALLOWED_CHATS []int64 `json:"allowed_chats"`
	LCPP_API_URL  string  `json:"lcpp_api_url"`
	LCPP_MODEL    string  `json:"lcpp_model"`
	DC_MODEL      string  `json:"dc_model"`
	VERSION       string  `json:"version"`
}

var loadedConfig Config
var configFile embed.FS

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
	log.Println("Loading config.json...")
	log.Println("Version:", loadedConfig.VERSION)
	log.Println("Bot Token:", loadedConfig.TOKEN)
	log.Println("Admins:", loadedConfig.ADMINS)
	log.Println("Allowed Chats:", loadedConfig.ALLOWED_CHATS)
	log.Println("llama.cpp API URL:", loadedConfig.LCPP_API_URL)
	log.Println("llama.cpp Model:", loadedConfig.LCPP_MODEL)
	log.Println("DuckChat Model:", loadedConfig.DC_MODEL)
}

func GetConfig() Config {
	return loadedConfig
}

// Add a function to provide the DC_MODEL value
func GetDCModel() string {
	return loadedConfig.DC_MODEL
}

func init() {
	ReadConfig()
}
