package telegram

import (
	"fmt"
	"ket/permissions" // Added import for utils package
	"log"
	"strconv"
	"strings"

	tele "gopkg.in/telebot.v4"
)


func HandleStartCommand(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt for /start by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Println("User:", c.Message().Chat.ID, "started the bot")
	return c.Send(
		`This version of Ket.ai is still in development.
You can use @ketailegacy_bot to access the old version.`,
	)
}

func HandleAddUser(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /adduser by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /adduser <user_id>")
	}
	userID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return c.Reply("Invalid user ID.")
	}
	err = permissions.AddUser(userID)
	if err != nil {
		return c.Reply(fmt.Sprintf("Error adding user: %v", err))
	}
	return c.Reply(fmt.Sprintf("User %d added successfully.", userID))
}

func HandleRemoveUser(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /rmuser by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /rmuser <user_id>")
	}
	userID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return c.Reply("Invalid user ID.")
	}
	err = permissions.RemoveUser(userID)
	if err != nil {
		return c.Reply(fmt.Sprintf("Error removing user: %v", err))
	}
	return c.Reply(fmt.Sprintf("User %d removed successfully.", userID))
}

func HandleAddChat(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /addchat by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /addchat <chat_id>")
	}
	chatID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return c.Reply("Invalid chat ID.")
	}
	err = permissions.AddChat(chatID)
	if err != nil {
		return c.Reply(fmt.Sprintf("Error adding chat: %v", err))
	}
	return c.Reply(fmt.Sprintf("Chat %d added successfully.", chatID))
}

func HandleRemoveChat(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /rmchat by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /rmchat <chat_id>")
	}
	chatID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return c.Reply("Invalid chat ID.")
	}
	err = permissions.RemoveChat(chatID)
	if err != nil {
		return c.Reply(fmt.Sprintf("Error removing chat: %v", err))
	}
	return c.Reply(fmt.Sprintf("Chat %d removed successfully.", chatID))
}

func HandleList(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("Unauthorized access attempt for /list by user ID: %d", c.Sender().ID)
		return c.Reply("You are not authorized to use this command.")
	}

	users := permissions.ListUsers()
	chats := permissions.ListChats()

	var response strings.Builder
	response.WriteString("Allowed Users:\n")
	for _, user := range users {
		response.WriteString(fmt.Sprintf("- `%d`\n", user))
	}

	response.WriteString("\nAllowed Chats:\n")
	for _, chat := range chats {
		response.WriteString(fmt.Sprintf("- `%d`\n", chat))
	}

	return c.Send(response.String(), &tele.SendOptions{ParseMode: tele.ModeMarkdown})
}
