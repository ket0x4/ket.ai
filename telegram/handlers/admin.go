package handlers

import (
	"fmt"
	"ket/permissions"
	"log"
	"strconv"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// Helper: parse single int64 argument
func parseSingleIDArg(c tele.Context, usage string) (int64, bool) {
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		c.Reply(usage)
		return 0, false
	}
	id, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		c.Reply("Invalid ID.")
		return 0, false
	}
	return id, true
}

func HandleAddChat(c tele.Context) error {
	chatID, ok := parseSingleIDArg(c, "Usage: /addchat <chat_id>")
	if !ok {
		return nil
	}
	err := permissions.AddChat(chatID)
	if err != nil {
		return sendError(c, "Error adding chat", err)
	}
	log.Printf("/addchat | user:%d chat:%d added chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d added successfully.", chatID))
}

func HandleRemoveChat(c tele.Context) error {
	chatID, ok := parseSingleIDArg(c, "Usage: /rmchat <chat_id>")
	if !ok {
		return nil
	}
	err := permissions.RemoveChat(chatID)
	if err != nil {
		return sendError(c, "Error removing chat", err)
	}
	log.Printf("/rmchat | user:%d chat:%d removed chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d removed successfully.", chatID))
}

func HandleList(c tele.Context) error {
	chats := permissions.ListChats()
	var response strings.Builder
	response.WriteString("\nAllowed Chats:\n")
	for _, chat := range chats {
		response.WriteString(fmt.Sprintf("- `%d`\n", chat))
	}
	log.Printf("/list | user:%d chat:%d listed users/chats", c.Sender().ID, c.Chat().ID)
	err := c.Send(response.String(), &tele.SendOptions{ParseMode: tele.ModeMarkdown})
	if err != nil {
		return c.Send(response.String())
	}
	return nil
}
