package config

import (
	"os"
	"testing"
)

func TestParseConfigFile(t *testing.T) {
	// Create a dummy config file
	content := []byte(`{
		"token": "test_token",
		"backend": "test_backend",
		"api_url": "test_api_url",
		"api_key": "test_api_key",
		"model": "test_model",
		"version": "test_version",
		"sys_prompt": "test_sys_prompt",
		"max_queue": 10
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

	if config.TOKEN != "test_token" {
		t.Errorf("Expected token to be 'test_token', got %s", config.TOKEN)
	}

	if config.MAX_QUEUE != 10 {
		t.Errorf("Expected max_queue to be 10, got %d", config.MAX_QUEUE)
	}
}
