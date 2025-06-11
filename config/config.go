package config

import (
	"embed"
	"encoding/json"
	"log"
)

type Config struct {
	TOKEN         string  `json:"token"`
	ADMINS        []int64 `json:"admins"`
	ALLOWED_CHATS []int64 `json:"allowed_chats"`
	API_URL       string  `json:"api_url"`
	API_KEY       string  `json:"api_key"`
	MODEL         string  `json:"model"`
	VERSION       string  `json:"version"`
	SYS_PROMPT    string  `json:"sys_prompt"`
	MAX_QUEUE     int     `json:"max_queue"`
}

var loadedConfig Config

const configFilePath = "config.json"

//go:embed config.json
var configFile embed.FS

func parseConfigFile(filePath string) (Config, error) {
	var config Config
	bytes, err := configFile.ReadFile(filePath)
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
	//log.Println("Bot Token:", loadedConfig.TOKEN)
	log.Println("Admins:", loadedConfig.ADMINS)
	log.Println("Allowed Chats:", loadedConfig.ALLOWED_CHATS)
	log.Println("llama.cpp API URL:", loadedConfig.API_URL+"/v1")
	//log.Println("llama.cpp API Key:", loadedConfig.API_KEY)
	log.Println("llama.cpp Model:", loadedConfig.MODEL)
	log.Println("System Prompt:", loadedConfig.SYS_PROMPT)
	log.Println("Max Queue Size:", loadedConfig.MAX_QUEUE)
	log.Println("Config loaded successfully.")
}

func GetConfig() Config {
	return loadedConfig
}

func init() {
	ReadConfig()
}
