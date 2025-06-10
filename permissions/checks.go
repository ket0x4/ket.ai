package permissions

import (
	"encoding/json"
	"log"
	"os"
	"slices"
	"sync"
)

// AllowedIDs holds the lists of allowed user, chat, and group IDs.
type AllowedIDs struct {
	AllowedUsers  []int64 `json:"allowed_users"`
	AllowedChats  []int64 `json:"allowed_chats"`
	AllowedGroups []int64 `json:"allowed_groups"`
}

var (
	allowedIDsData *AllowedIDs
	loadOnce       sync.Once
	loadError      error
)

// chatsFilePath is the path to the JSON file containing allowed IDs,
// relative to this permissions.go file.
const chatsFilePath = "chats.json"

// loadAllowedIDs reads and unmarshals the chats.json file.
// It ensures this operation is performed only once.
func loadAllowedIDs() {
	loadOnce.Do(func() {
		data, err := os.ReadFile(chatsFilePath)
		if err != nil {
			log.Printf("Error reading allowed IDs file (%s): %v", chatsFilePath, err)
			loadError = err
			return
		}

		var ids AllowedIDs
		err = json.Unmarshal(data, &ids)
		if err != nil {
			log.Printf("Error unmarshalling allowed IDs data from %s: %v", chatsFilePath, err)
			loadError = err
			return
		}
		allowedIDsData = &ids
		log.Printf("Successfully loaded allowed IDs from %s", chatsFilePath)
	})
}

// IsAllowed checks if the given ID (user, chat, or group) is present
// in the lists of allowed IDs loaded from chats.json.
// It returns true if the ID is allowed, false otherwise.
// If there was an error loading the configuration, it defaults to false.
func IsAllowed(id int64) bool {
	loadAllowedIDs()

	if loadError != nil {
		log.Printf("Permission check for ID %d failed: error loading allowed IDs: %v", id, loadError)
		return false // Default to not allowed if configuration loading failed
	}

	if allowedIDsData == nil {
		log.Printf("Permission check for ID %d failed: allowed IDs data is not loaded.", id)
		return false // Should not happen if loadError is nil, but as a safeguard
	}

	// Check if ID is in AllowedUsers
	if slices.Contains(allowedIDsData.AllowedUsers, id) {
		return true
	}

	// Check if ID is in AllowedChats
	if slices.Contains(allowedIDsData.AllowedChats, id) {
		return true
	}

	// Check if ID is in AllowedGroups
	return slices.Contains(allowedIDsData.AllowedGroups, id)
}
