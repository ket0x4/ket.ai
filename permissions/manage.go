package permissions

import (
	"slices"

	"ket/config"
)

// AddUser adds a user ID to the merged AllowedChats/Users list.
// Since allowed users and chats are unified for Telegram, we append to Permissions.AllowedChats.
func AddUser(id int64) error {
	cfg := config.GetConfig()
	// ensure slice exists
	if !slices.Contains(cfg.Permissions.AllowedChats, id) {
		cfg.Permissions.AllowedChats = append(cfg.Permissions.AllowedChats, id)
	}
	config.UpdateConfig(cfg)
	return config.SaveConfig()
}

// RemoveUser removes a user ID from the merged AllowedChats list.
func RemoveUser(id int64) error {
	cfg := config.GetConfig()
	cfg.Permissions.AllowedChats = slices.DeleteFunc(cfg.Permissions.AllowedChats, func(i int64) bool { return i == id })
	config.UpdateConfig(cfg)
	return config.SaveConfig()
}

// AddChat adds a chat ID to the merged AllowedChats list.
func AddChat(id int64) error {
	cfg := config.GetConfig()
	if !slices.Contains(cfg.Permissions.AllowedChats, id) {
		cfg.Permissions.AllowedChats = append(cfg.Permissions.AllowedChats, id)
	}
	config.UpdateConfig(cfg)
	return config.SaveConfig()
}

// RemoveChat removes a chat ID from the merged AllowedChats list.
func RemoveChat(id int64) error {
	cfg := config.GetConfig()
	cfg.Permissions.AllowedChats = slices.DeleteFunc(cfg.Permissions.AllowedChats, func(i int64) bool { return i == id })
	config.UpdateConfig(cfg)
	return config.SaveConfig()
}

// ListUsers returns the merged AllowedChats list (users are included in the same list for Telegram compatibility).
func ListUsers() []int64 {
	cfg := config.GetConfig()
	return cfg.Permissions.AllowedChats
}

// ListChats returns the merged AllowedChats list.
func ListChats() []int64 {
	cfg := config.GetConfig()
	return cfg.Permissions.AllowedChats
}
