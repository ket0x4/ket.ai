package rag

import (
	"encoding/json"
	"io"
	"os"
	"sync"
)

var (
	ragDataFile = "rag_data.json"
	fileMutex   sync.RWMutex
)

// saveChatHistories persists chatHistories to disk using a safe-write pattern.
// It writes to a temporary file first, then renames it to the final destination.
// This ensures that the original data file is not corrupted if the write is interrupted.
func saveChatHistories(chatHistories map[int64][]Document) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	// Create a temporary file in the same directory as the final file to ensure
	// that it's on the same device, which is required for os.Rename to be atomic.
	tempFile, err := os.CreateTemp(".", ragDataFile+".*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tempFile.Name()) // Clean up the temp file on exit.

	// Encode the data to the temporary file.
	encoder := json.NewEncoder(tempFile)
	encoder.SetIndent("", "  ") // Pretty print for debugging.
	if err := encoder.Encode(chatHistories); err != nil {
		tempFile.Close()
		return err
	}

	// Close the temporary file to ensure all data is flushed to disk.
	if err := tempFile.Close(); err != nil {
		return err
	}

	// Atomically rename the temporary file to the final destination file.
	// This is an atomic operation on most filesystems, which prevents race conditions.
	if err := os.Rename(tempFile.Name(), ragDataFile); err != nil {
		return err
	}

	return nil
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

// BackupChatHistories creates a backup of the current RAG data using an efficient file copy.
func BackupChatHistories() error {
	fileMutex.RLock()
	defer fileMutex.RUnlock()

	// Open the source file for reading.
	sourceFile, err := os.Open(ragDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file to backup.
		}
		return err
	}
	defer sourceFile.Close()

	// Create a new file for the backup.
	backupFile := ragDataFile + ".backup"
	destFile, err := os.Create(backupFile)
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the contents of the source file to the destination file.
	// This is more efficient than decoding and re-encoding the JSON data.
	_, err = io.Copy(destFile, sourceFile)
	return err
}
