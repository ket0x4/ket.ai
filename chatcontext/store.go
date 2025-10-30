package chatcontext

import (
	"encoding/json"
	"os"
	"sync"
)

var (
	ccDataFile = "history.json"
	fileMutex  sync.RWMutex
)

// Persists the ChatContext data to disk.
// It writes to a temporary file first, then renames it to the final destination.
// This ensures that the original data file is not corrupted if the write is interrupted.
func saveChatHistories(data []Document) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	// Create a temporary file in the same directory as the final file to ensure
	// that it's on the same device, which is required for os.Rename to be atomic.
	tempFile, err := os.CreateTemp(".", ccDataFile+".*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tempFile.Name())

	// Encode the data to the temporary file.
	encoder := json.NewEncoder(tempFile)
	encoder.SetIndent("", "  ") // Pretty print for debugging.
	if err := encoder.Encode(data); err != nil {
		tempFile.Close()
		return err
	}

	// Close the temporary file to ensure all data is flushed to disk.
	if err := tempFile.Close(); err != nil {
		return err
	}

	// Atomically rename the temporary file to the final destination file.
	// This is an atomic operation on most filesystems, which prevents race conditions.
	if err := os.Rename(tempFile.Name(), ccDataFile); err != nil {
		return err
	}

	return nil
}

// Load the history data from disk.
func loadChatHistories() ([]Document, error) {
	fileMutex.RLock()
	defer fileMutex.RUnlock()

	file, err := os.Open(ccDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return []Document{}, nil
		}
		return nil, err
	}
	defer file.Close()

	var data []Document
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&data); err != nil && err.Error() != "EOF" {
		return nil, err
	}

	return data, nil
}
