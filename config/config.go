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
	API_URL       string  `json:"api_url"`
	MODEL         string  `json:"model"`
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
	log.Println("llama.cpp API URL:", loadedConfig.API_URL)
	log.Println("llama.cpp Model:", loadedConfig.MODEL)
}

func GetConfig() Config {
	return loadedConfig
}

func init() {
	ReadConfig()
}
