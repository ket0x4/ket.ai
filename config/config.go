package config

import (
	"encoding/json"
	"log"
	"os"
)

// Now hardcoded
const configFilePath = "config.json"
const Version = "7.1"
const GenCommand = "dave"
const BotName = "Dave"

var loadedConfig Config

func init() {
	ReadConfig()
}

type BotSetup struct {
	Token               string  `json:"token"`
	MaxQueue            int     `json:"max_queue"`
	MaxMessagesPerGroup int     `json:"max_messages_per_group"`
	TriggerProbability  float64 `json:"trigger_probability"`
}

type BackendSetup struct {
	ApiUrl      string `json:"api_url"`
	ApiKey      string `json:"api_key"`
	Model       string `json:"model"`
	InputLength int    `json:"input_length"`
	SysPrompt   string `json:"system_prompt"`
	AutoPrompt  string `json:"auto_prompt"`
}

type HistorySetup struct {
	MaxHistorySize      int `json:"max_history_size"`
	SummaryTriggerCount int `json:"summary_trigger_count"`
}

type Permissions struct {
	AllowedChats []int64 `json:"allowed_chats"`
	Admins       []int64 `json:"admins"`
}

type Config struct {
	BotSetup     BotSetup     `json:"bot_setup"`
	BackendSetup BackendSetup `json:"backend_setup"`
	HistorySetup HistorySetup `json:"history_setup"`
	Permissions  Permissions  `json:"permissions"`
}

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
	log.Println("------------------------------------------")
	log.Println("Version:", Version)
	log.Println("API URL:", loadedConfig.BackendSetup.ApiUrl)
	log.Println("Model:", loadedConfig.BackendSetup.Model)
	log.Println("Max Queue Size:", loadedConfig.BotSetup.MaxQueue)
	log.Println("Max Messages Per Group:", loadedConfig.BotSetup.MaxMessagesPerGroup)
	log.Println("Trigger Probability:", loadedConfig.BotSetup.TriggerProbability)
	log.Println("Max History Size:", loadedConfig.HistorySetup.MaxHistorySize)
	log.Println("Summary Trigger Count:", loadedConfig.HistorySetup.SummaryTriggerCount)
	log.Println("------------------------------------------")
	log.Println("Config loaded successfully.")
}

func GetConfig() Config {
	return loadedConfig
}

func UpdateConfig(newConfig Config) {
	loadedConfig = newConfig
}

// SaveConfig writes the current loadedConfig to config.json, including SysPrompt from file.
func SaveConfig() error {
	data, err := json.MarshalIndent(loadedConfig, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(configFilePath, data, 0644)
}
