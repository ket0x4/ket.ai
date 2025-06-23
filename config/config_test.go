package config

import (
	"os"
	"testing"
)

func TestParseConfigFile(t *testing.T) {
	// Create a dummy config file
	content := []byte(`{
		"Version": "test_version",
		"BotSetup": {
			"token": "test_token",
			"max_queue": 10
		},
		"BackendSetup": {
			"api_url": "test_api_url",
			"api_key": "test_api_key",
			"model": "test_model",
			"input_length": 2048,
			"yt-language": "en",
			"sys_prompt": "test_sys_prompt"
		},
		"logging": {
			"level": "info",
			"file": "test.log"
		},
		"http_proxy": ""
	}`)
	tmpfile, err := os.CreateTemp("", "config.json")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name()) // clean up

	if _, err := tmpfile.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	config, err := parseConfigFile(tmpfile.Name())
	if err != nil {
		t.Errorf("parseConfigFile() error = %v", err)
	}

	if config.BotSetup.Token != "test_token" {
		t.Errorf("Expected token to be 'test_token', got %s", config.BotSetup.Token)
	}

	if config.BotSetup.MaxQueue != 10 {
		t.Errorf("Expected max_queue to be 10, got %d", config.BotSetup.MaxQueue)
	}

	if config.BackendSetup.ApiUrl != "test_api_url" {
		t.Errorf("Expected api_url to be 'test_api_url', got %s", config.BackendSetup.ApiUrl)
	}

	if config.BackendSetup.ApiKey != "test_api_key" {
		t.Errorf("Expected api_key to be 'test_api_key', got %s", config.BackendSetup.ApiKey)
	}

	if config.BackendSetup.Model != "test_model" {
		t.Errorf("Expected model to be 'test_model', got %s", config.BackendSetup.Model)
	}

	if config.Version != "test_version" {
		t.Errorf("Expected version to be 'test_version', got %s", config.Version)
	}

	if config.BackendSetup.SysPrompt != "test_sys_prompt" {
		t.Errorf("Expected sys_prompt to be 'test_sys_prompt', got %s", config.BackendSetup.SysPrompt)
	}
}
