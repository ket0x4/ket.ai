package config

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	TOKEN       string `json:"token"`
	API_URL     string `json:"api_url"`
	API_KEY     string `json:"api_key"`
	MODEL       string `json:"model"`
	VERSION     string `json:"version"`
	SYS_PROMPT  string `json:"sys_prompt"`
	MAX_QUEUE   int    `json:"max_queue"`
	YT_LANGUAGE string `json:"yt-language"`
	HTTP_PROXY  string `json:"http_proxy"`
}

var loadedConfig Config

const configFilePath = "config.json"

func parseConfigFile(filePath string) (Config, error) {
	var config Config
	bytes, err := os.ReadFile(filePath)
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
	c, err := parseConfigFile(configFilePath)
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}
	loadedConfig = c
	LogConfig()
}

func LogConfig() {
	log.Println("Loading config.json...")
	log.Println("------------------------------------------")
	log.Println("Version:", loadedConfig.VERSION)
	log.Println("Proxy:", loadedConfig.HTTP_PROXY)
	log.Println("YouTube Language:", loadedConfig.YT_LANGUAGE)
	log.Println("API URL:", loadedConfig.API_URL)
	log.Println("Model:", loadedConfig.MODEL)
	//log.Println("System Prompt:", loadedConfig.SYS_PROMPT)
	log.Println("Max Queue Size:", loadedConfig.MAX_QUEUE)
	log.Println("------------------------------------------")
	log.Println("Config loaded successfully.")
}

func GetConfig() Config {
	return loadedConfig
}

func init() {
	ReadConfig()
}
