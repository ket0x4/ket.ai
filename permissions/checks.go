package permissions

import (
	"encoding/json"
	"log"
	"os"
	"slices"
	"sync"
)

// AllowedIDs holds the lists of allowed user and chat IDs.
type AllowedIDs struct {
	AllowedUsers []int64 `json:"allowed_users"`
	AllowedChats []int64 `json:"allowed_chats"`
	Admins       []int64 `json:"admins"`
}

var (
	allowedIDsData      *AllowedIDs
	loadOnce            sync.Once
	loadError           error
	allowedIDsDataMutex sync.RWMutex
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
		log.Printf("Successfully loaded allowed IDs from %s. Users: %d, Chats: %d", chatsFilePath, len(ids.AllowedUsers), len(ids.AllowedChats))
	})
}

// IsAllowed checks if the given ID (user or chat) is present
// in the lists of allowed IDs loaded from chats.json.
// It returns true if the ID is allowed, false otherwise.
// If there was an error loading the configuration, it defaults to false.
func IsAllowed(id int64) bool {
	loadAllowedIDs()

	if loadError != nil {
		log.Printf("Permission check for ID %d failed: error loading allowed IDs: %v", id, loadError)
		return false // Default to not allowed if configuration loading failed
	}

	allowedIDsDataMutex.RLock()
	defer allowedIDsDataMutex.RUnlock()

	if allowedIDsData == nil {
		log.Printf("Permission check for ID %d failed: allowed IDs data is not loaded.", id)
		return false // Should not happen if loadError is nil, but as a safeguard
	}

	// Check if ID is in AllowedUsers
	if slices.Contains(allowedIDsData.AllowedUsers, id) {
		return true
	}

	// Check if ID is in AllowedChats
	return slices.Contains(allowedIDsData.AllowedChats, id)
}

// IsAllowedUser checks if the given user ID is present
// in the lists of allowed user IDs loaded from chats.json.
func IsAllowedUser(id int64) bool {
	loadAllowedIDs()

	if loadError != nil {
		log.Printf("Permission check for user ID %d failed: error loading allowed IDs: %v", id, loadError)
		return false // Default to not allowed if configuration loading failed
	}

	allowedIDsDataMutex.RLock()
	defer allowedIDsDataMutex.RUnlock()

	if allowedIDsData == nil {
		log.Printf("Permission check for user ID %d failed: allowed IDs data is not loaded.", id)
		return false // Should not happen if loadError is nil, but as a safeguard
	}

	// Check if ID is in AllowedUsers
	return slices.Contains(allowedIDsData.AllowedUsers, id)
}

// IsAdmin checks if the given user ID is present
// in the lists of admin user IDs loaded from chats.json.
func IsAdmin(id int64) bool {
	loadAllowedIDs()

	if loadError != nil {
		log.Printf("Permission check for admin ID %d failed: error loading allowed IDs: %v", id, loadError)
		return false // Default to not allowed if configuration loading failed
	}

	allowedIDsDataMutex.RLock()
	defer allowedIDsDataMutex.RUnlock()

	if allowedIDsData == nil {
		log.Printf("Permission check for admin ID %d failed: allowed IDs data is not loaded.", id)
		return false // Should not happen if loadError is nil, but as a safeguard
	}

	// Check if ID is in Admins
	return slices.Contains(allowedIDsData.Admins, id)
}
