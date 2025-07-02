package rag

import (
	"encoding/json"
	"io"
	"log"
	"os"
	"sync"
)

var (
	ragDataFile = "rag_data.json"
	fileMutex   sync.RWMutex
)

// saveChatHistories persists the RAG data to disk.
// It writes to a temporary file first, then renames it to the final destination.
// This ensures that the original data file is not corrupted if the write is interrupted.
func saveChatHistories(data []Document) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	// First, create a backup of the existing file.
	if err := backupChatHistories(); err != nil {
		log.Printf("RAG: Failed to create backup: %v", err)
		// Continue anyway, as saving is more important.
	}

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
	if err := os.Rename(tempFile.Name(), ragDataFile); err != nil {
		return err
	}

	return nil
}

// loadChatHistories loads the RAG data from disk.
func loadChatHistories() ([]Document, error) {
	fileMutex.RLock()
	defer fileMutex.RUnlock()

	file, err := os.Open(ragDataFile)
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

// Exported versions for use in rag.go
func SaveChatHistories(data []Document) error {
	return saveChatHistories(data)
}

func LoadChatHistories() ([]Document, error) {
	return loadChatHistories()
}

// backupChatHistories creates a backup of the current RAG data.
func backupChatHistories() error {
	// This function is called from saveChatHistories, which already holds a lock.
	sourceFile, err := os.Open(ragDataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file to backup.
		}
		return err
	}
	defer sourceFile.Close()

	// Create the destination file for writing.
	destFile, err := os.Create(ragDataFile + ".bak")
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the contents from source to destination.
	_, err = io.Copy(destFile, sourceFile)
	return err
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

	// Create the destination file for writing.
	destFile, err := os.Create(ragDataFile + ".bak")
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy the contents from source to destination.
	_, err = io.Copy(destFile, sourceFile)
	return err
}
