package telegram

import (
	"fmt"
	"ket/permissions" // Added import for utils package
	"ket/utils"
	"log"
	"strconv"
	"strings"

	tele "gopkg.in/telebot.v4"
)

func HandleStartCommand(c tele.Context) error {
	log.Printf("[CMD] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("[DENY] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Printf("[ALLOW] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	return c.Send(
		`This version of Ket.ai is still in development.
You can use @ketailegacy_bot to access the old version.`,
	)
}

func HandleAddUser(c tele.Context) error {
	log.Printf("[CMD] /adduser | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] /adduser | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /adduser <user_id>")
	}
	userID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		log.Printf("[FAIL] /adduser | user:%d chat:%d invalid user_id:%q", c.Sender().ID, c.Chat().ID, args[1])
		return c.Reply("Invalid user ID.")
	}
	err = permissions.AddUser(userID)
	if err != nil {
		log.Printf("[FAIL] /adduser | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error adding user: %v", err))
	}
	log.Printf("[OK] /adduser | user:%d chat:%d added user:%d", c.Sender().ID, c.Chat().ID, userID)
	return c.Reply(fmt.Sprintf("User %d added successfully.", userID))
}

func HandleRemoveUser(c tele.Context) error {
	log.Printf("[CMD] /rmuser | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] /rmuser | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /rmuser <user_id>")
	}
	userID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		log.Printf("[FAIL] /rmuser | user:%d chat:%d invalid user_id:%q", c.Sender().ID, c.Chat().ID, args[1])
		return c.Reply("Invalid user ID.")
	}
	err = permissions.RemoveUser(userID)
	if err != nil {
		log.Printf("[FAIL] /rmuser | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error removing user: %v", err))
	}
	log.Printf("[OK] /rmuser | user:%d chat:%d removed user:%d", c.Sender().ID, c.Chat().ID, userID)
	return c.Reply(fmt.Sprintf("User %d removed successfully.", userID))
}

func HandleAddChat(c tele.Context) error {
	log.Printf("[CMD] /addchat | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] /addchat | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /addchat <chat_id>")
	}
	chatID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		log.Printf("[FAIL] /addchat | user:%d chat:%d invalid chat_id:%q", c.Sender().ID, c.Chat().ID, args[1])
		return c.Reply("Invalid chat ID.")
	}
	err = permissions.AddChat(chatID)
	if err != nil {
		log.Printf("[FAIL] /addchat | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error adding chat: %v", err))
	}
	log.Printf("[OK] /addchat | user:%d chat:%d added chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d added successfully.", chatID))
}

func HandleRemoveChat(c tele.Context) error {
	log.Printf("[CMD] /rmchat | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] /rmchat | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this command.")
	}
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		return c.Reply("Usage: /rmchat <chat_id>")
	}
	chatID, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		log.Printf("[FAIL] /rmchat | user:%d chat:%d invalid chat_id:%q", c.Sender().ID, c.Chat().ID, args[1])
		return c.Reply("Invalid chat ID.")
	}
	err = permissions.RemoveChat(chatID)
	if err != nil {
		log.Printf("[FAIL] /rmchat | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error removing chat: %v", err))
	}
	log.Printf("[OK] /rmchat | user:%d chat:%d removed chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d removed successfully.", chatID))
}

func HandleStatus(c tele.Context) error {
	log.Printf("[CMD] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("[DENY] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Printf("[ALLOW] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	return c.Send(utils.GetSystemStats(), tele.ModeHTML)
}

func HandleList(c tele.Context) error {
	log.Printf("[CMD] /list | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] /list | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
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

	log.Printf("[OK] /list | user:%d chat:%d listed users/chats", c.Sender().ID, c.Chat().ID)
	return c.Send(response.String(), &tele.SendOptions{ParseMode: tele.ModeMarkdown})
}
