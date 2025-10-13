package permissions

import (
	"log"
	"slices"

	"ket/config"
)

// IsAllowed checks if the given ID (user or chat) is present
// in the lists of allowed IDs loaded from chats.json.
// It returns true if the ID is allowed, false otherwise.
// If there was an error loading the configuration, it defaults to false.
func IsAllowed(id int64) bool {
	permissions := config.GetConfig().Permissions
	if permissions.AllowedChats == nil {
		log.Printf("Permission check for ID %d failed: allowed IDs data is not loaded.", id)
		return false
	}

	// Check merged AllowedChats (contains both users and chats for Telegram)
	return slices.Contains(permissions.AllowedChats, id)
}

// IsAllowedUser checks if the given user ID is present
// in the lists of allowed user IDs loaded from chats.json.
func IsAllowedUser(id int64) bool {
	// For Telegram, user IDs are in the merged AllowedChats list
	return IsAllowed(id)
}

// IsAdmin checks if the given user ID is present
// in the lists of admin user IDs loaded from chats.json.
func IsAdmin(id int64) bool {
	permissions := config.GetConfig().Permissions
	if permissions.Admins == nil {
		log.Printf("Permission check for admin ID %d failed: allowed IDs data is not loaded.", id)
		return false
	}

	// Check if ID is in Admins
	return slices.Contains(permissions.Admins, id)
}
