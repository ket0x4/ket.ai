package utils

import (
	"fmt"
	"ket/permissions"
	"log"
	"strconv"
	"strings"

	tele "gopkg.in/telebot.v4"
)

func extractID(c tele.Context) (int64, bool) {
	parts := strings.Split(c.Message().Text, " ")
	if len(parts) < 2 {
		c.Reply("Please provide an ID.")
		return 0, false
	}
	id, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		c.Reply("Invalid ID format.")
		return 0, false
	}
	return id, true
}

func HandleAddUserCommand(c tele.Context) error {
	if !permissions.IsAllowedUser(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /adduser by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	id, ok := extractID(c)
	if !ok {
		return nil
	}
	if err := permissions.AddUser(id); err != nil {
		log.Printf("Error adding user %d: %v", id, err)
		return c.Reply("Failed to add user.")
	}
	log.Printf("User %d added user %d", c.Sender().ID, id)
	return c.Reply("User added successfully.")
}

func HandleRemoveUserCommand(c tele.Context) error {
	if !permissions.IsAllowedUser(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /rmuser by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	id, ok := extractID(c)
	if !ok {
		return nil
	}
	if err := permissions.RemoveUser(id); err != nil {
		log.Printf("Error removing user %d: %v", id, err)
		return c.Reply("Failed to remove user.")
	}
	log.Printf("User %d removed user %d", c.Sender().ID, id)
	return c.Reply("User removed successfully.")
}

func HandleAddChatCommand(c tele.Context) error {
	if !permissions.IsAllowedUser(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /addchat by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	id, ok := extractID(c)
	if !ok {
		return nil
	}
	if err := permissions.AddChat(id); err != nil {
		log.Printf("Error adding chat %d: %v", id, err)
		return c.Reply("Failed to add chat.")
	}
	log.Printf("User %d added chat %d", c.Sender().ID, id)
	return c.Reply("Chat added successfully.")
}

func HandleRemoveChatCommand(c tele.Context) error {
	if !permissions.IsAllowedUser(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /rmchat by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	id, ok := extractID(c)
	if !ok {
		return nil
	}
	if err := permissions.RemoveChat(id); err != nil {
		log.Printf("Error removing chat %d: %v", id, err)
		return c.Reply("Failed to remove chat.")
	}
	log.Printf("User %d removed chat %d", c.Sender().ID, id)
	return c.Reply("Chat removed successfully.")
}

func HandleUsersCommand(c tele.Context) error {
	if !permissions.IsAllowedUser(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /users by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	users := permissions.ListUsers()
	var list strings.Builder
	list.WriteString("Allowed Users:\n")
	for _, user := range users {
		list.WriteString(fmt.Sprintf("- `%d`\n", user))
	}

	chats := permissions.ListChats()
	list.WriteString("\nAllowed Chats:\n")
	for _, chat := range chats {
		list.WriteString(fmt.Sprintf("- `%d`\n", chat))
	}

	log.Printf("User %d listed users and chats", c.Sender().ID)
	return c.Send(list.String(), &tele.SendOptions{ParseMode: tele.ModeMarkdown})
}
