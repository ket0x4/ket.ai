package chatcontext

import (
	"encoding/json"
	"io"
	"log"
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
// I know its looks like retarded but works fine so idc
func saveChatHistories(data []Document) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	// First, create a backup of the existing file.
	if err := backupChatHistories(); err != nil {
		log.Printf("ChatContext: Failed to create backup: %v", err)
		// Continue anyway, as saving is more important.
	}

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

// Exported versions for use in history.go
func SaveChatHistories(data []Document) error {
	return saveChatHistories(data)
}

func LoadChatHistories() ([]Document, error) {
	return loadChatHistories()
}

// Creates a backup of the current history data.
func backupChatHistories() error {
	// This function is called from saveChatHistories, which already holds a lock.
	sourceFile, err := os.Open(ccDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file to backup.
		}
		return err
	}
	defer sourceFile.Close()

	// Create the destination file for writing.
	destFile, err := os.Create(ccDataFile + ".bak")
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the contents from source to destination.
	_, err = io.Copy(destFile, sourceFile)
	return err
}

// idk why theres a 2 func for same job but im not gonna remove till optimize entire codebase
/* Create a backup of the current history data using an efficient file copy.
func BackupChatHistories() error {
	fileMutex.RLock()
	defer fileMutex.RUnlock()

	// Open the source file for reading.
	sourceFile, err := os.Open(ccDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file to backup.
		}
		return err
	}
	defer sourceFile.Close()

	// Create the destination file for writing.
	destFile, err := os.Create(ccDataFile + ".bak")
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the contents from source to destination.
	_, err = io.Copy(destFile, sourceFile)
	return err
}
*/
