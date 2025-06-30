package rag

import (
	"encoding/json"
	"os"
	"sync"
)

var (
	ragDataFile = "rag_data.json"
	fileMutex   sync.RWMutex
)

// saveChatHistories persists chatHistories to disk.
func saveChatHistories(chatHistories map[int64][]Document) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()
	
	file, err := os.Create(ragDataFile)
	if err != nil {
		return err
	}
	defer file.Close()
	
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ") // Pretty print for debugging
	return encoder.Encode(chatHistories)
}

// loadChatHistories loads chatHistories from disk.
func loadChatHistories() (map[int64][]Document, error) {
	fileMutex.RLock()
	defer fileMutex.RUnlock()
	
	file, err := os.Open(ragDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[int64][]Document), nil
		}
		return nil, err
	}
	defer file.Close()
	
	var data map[int64][]Document
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&data); err != nil {
		return nil, err
	}
	
	// Initialize empty map if data is nil
	if data == nil {
		data = make(map[int64][]Document)
	}
	
	return data, nil
}

// Exported versions for use in rag.go
func SaveChatHistories(chatHistories map[int64][]Document) error {
	return saveChatHistories(chatHistories)
}

func LoadChatHistories() (map[int64][]Document, error) {
	return loadChatHistories()
}

// BackupChatHistories creates a backup of the current RAG data
func BackupChatHistories() error {
	fileMutex.RLock()
	defer fileMutex.RUnlock()
	
	// Read current data
	sourceFile, err := os.Open(ragDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file to backup
		}
		return err
	}
	defer sourceFile.Close()
	
	// Create backup file with timestamp
	backupFile := ragDataFile + ".backup"
	destFile, err := os.Create(backupFile)
	if err != nil {
		return err
	}
	defer destFile.Close()
	
	// Copy data
	var data map[int64][]Document
	decoder := json.NewDecoder(sourceFile)
	if err := decoder.Decode(&data); err != nil {
		return err
	}
	
	encoder := json.NewEncoder(destFile)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}
