package config

import (
	"encoding/json"
	"log"
	"os"
)

type BotSetup struct {
	Token               string  `json:"token"`
	MaxQueue            int     `json:"max_queue"`
	Random              bool    `json:"random"`
	MaxMessagesPerGroup int     `json:"MaxMessagesPerGroup"`
	TriggerProbability  float64 `json:"TriggerProbability"`
}

type BackendSetup struct {
	ApiUrl      string `json:"api_url"`
	ApiKey      string `json:"api_key"`
	Model       string `json:"model"`
	InputLength int    `json:"input_length"`
	YtLanguage  string `json:"yt-language"`
	SysPrompt   string `json:"-"` // never marshal to JSON
	AutoPrompt  string `json:"-"` // used for auto response
}

type Logging struct {
	Level string `json:"level"`
	File  string `json:"file"`
}

type Config struct {
	Version      string       `json:"Version"`
	BotName      string       `json:"BotName"`
	GenCommand   string       `json:"GenCommand"`
	BotSetup     BotSetup     `json:"BotSetup"`
	BackendSetup BackendSetup `json:"BackendSetup"`
	Logging      Logging      `json:"logging"`
	HttpProxy    string       `json:"http_proxy"`
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

	sysPrompt, err := os.ReadFile("system_prompt.txt")
	if err != nil {
		log.Printf("Error loading system prompt: %v", err)
	}
	loadedConfig.BackendSetup.SysPrompt = string(sysPrompt)

	autoPrompt, err := os.ReadFile("auto_prompt.txt")
	if err != nil {
		log.Printf("Error loading auto prompt: %v", err)
	}
	loadedConfig.BackendSetup.AutoPrompt = string(autoPrompt)

	LogConfig()
}

func LogConfig() {
	log.Println("Loading config.json...")
	log.Println("------------------------------------------")
	log.Println("Version:", loadedConfig.Version)
	log.Println("BotName:", loadedConfig.BotName)
	log.Println("GenCommand:", loadedConfig.GenCommand)
	log.Println("Proxy:", loadedConfig.HttpProxy)
	log.Println("YouTube Language:", loadedConfig.BackendSetup.YtLanguage)
	log.Println("API URL:", loadedConfig.BackendSetup.ApiUrl)
	log.Println("Model:", loadedConfig.BackendSetup.Model)
	log.Println("Max Queue Size:", loadedConfig.BotSetup.MaxQueue)
	log.Println("Random:", loadedConfig.BotSetup.Random)
	log.Println("Max Messages Per Group:", loadedConfig.BotSetup.MaxMessagesPerGroup)
	log.Println("Trigger Probability:", loadedConfig.BotSetup.TriggerProbability)
	log.Println("------------------------------------------")
	log.Println("Config loaded successfully.")
}

func GetConfig() Config {
	return loadedConfig
}

func UpdateConfig(newConfig Config) {
	loadedConfig = newConfig
}

// SaveConfig writes the current loadedConfig to config.json, excluding SysPrompt from file.
func SaveConfig() error {
	cfgCopy := loadedConfig
	cfgCopy.BackendSetup.SysPrompt = "" // will not be marshaled due to json:"-"
	data, err := json.MarshalIndent(cfgCopy, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(configFilePath, data, 0644)
}

func init() {
	ReadConfig()
}
