package utils

// here we will handle the permissions of the bot. data will be saved in a json file for now
// the allowed chat ids will be saved in a json file
// admin can add or remove chat ids from the allowed chats

// to-do: functions will be implemented after enabling llama.cpp backend

// parse the json file and return the data
func ParseJsonFile() {
	// parse the json file
}

// load allowed chats from the json file
func LoadAllowedChats() {
	// load the json file
}

// load admin ids from the json file
func LoadAdmins() {
	// load the json file
}

// check if the user is an admin
func IsAdmin(userID int64) bool {
	// check if the user is in the admins list
	return true
}

// check if the chat is allowed
func IsChatAllowed(chatID int64) bool {
	// check if the chat is in the allowed chats
	return true
}

// save the allowed chats to the json file
func SaveAllowedChats() {
	// save the json file
}
