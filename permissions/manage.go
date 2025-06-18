package permissions

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"slices"
)

// saveAllowedIDs saves the current state of allowedIDsData to the JSON file.
func saveAllowedIDs() error {
	allowedIDsDataMutex.Lock()
	defer allowedIDsDataMutex.Unlock()

	data, err := json.MarshalIndent(allowedIDsData, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshalling allowed IDs: %w", err)
	}

	err = os.WriteFile(chatsFilePath, data, 0644)
	if err != nil {
		return fmt.Errorf("error writing allowed IDs file: %w", err)
	}

	log.Printf("Successfully saved allowed IDs to %s", chatsFilePath)
	return nil
}

// AddUser adds a user to the allowed list and saves it to the file.
func AddUser(id int64) error {
	loadAllowedIDs()
	if loadError != nil {
		return loadError
	}

	allowedIDsDataMutex.Lock()
	if !slices.Contains(allowedIDsData.AllowedUsers, id) {
		allowedIDsData.AllowedUsers = append(allowedIDsData.AllowedUsers, id)
	}
	allowedIDsDataMutex.Unlock()

	return saveAllowedIDs()
}

// RemoveUser removes a user from the allowed list and saves it.
func RemoveUser(id int64) error {
	loadAllowedIDs()
	if loadError != nil {
		return loadError
	}

	allowedIDsDataMutex.Lock()
	allowedIDsData.AllowedUsers = slices.DeleteFunc(allowedIDsData.AllowedUsers, func(i int64) bool {
		return i == id
	})
	allowedIDsDataMutex.Unlock()

	return saveAllowedIDs()
}

// AddChat adds a chat to the allowed list and saves it.
func AddChat(id int64) error {
	loadAllowedIDs()
	if loadError != nil {
		return loadError
	}

	allowedIDsDataMutex.Lock()
	if !slices.Contains(allowedIDsData.AllowedChats, id) {
		allowedIDsData.AllowedChats = append(allowedIDsData.AllowedChats, id)
	}
	allowedIDsDataMutex.Unlock()

	return saveAllowedIDs()
}

// RemoveChat removes a chat from the allowed list and saves it.
func RemoveChat(id int64) error {
	loadAllowedIDs()
	if loadError != nil {
		return loadError
	}

	allowedIDsDataMutex.Lock()
	allowedIDsData.AllowedChats = slices.DeleteFunc(allowedIDsData.AllowedChats, func(i int64) bool {
		return i == id
	})
	allowedIDsDataMutex.Unlock()

	return saveAllowedIDs()
}

// ListUsers returns a slice of allowed user IDs.
func ListUsers() []int64 {
	loadAllowedIDs()
	if loadError != nil {
		return nil
	}
	allowedIDsDataMutex.RLock()
	defer allowedIDsDataMutex.RUnlock()
	return allowedIDsData.AllowedUsers
}

// ListChats returns a slice of allowed chat IDs.
func ListChats() []int64 {
	loadAllowedIDs()
	if loadError != nil {
		return nil
	}
	allowedIDsDataMutex.RLock()
	defer allowedIDsDataMutex.RUnlock()
	return allowedIDsData.AllowedChats
}
