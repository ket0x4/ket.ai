package telegram

import (
	"ket/permissions" // Added import for utils package
	"log"

	tele "gopkg.in/telebot.v4"
)

func HandleHelp(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt for /help by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Println("User:", c.Message().Chat.ID, "requested help")
	return c.Send("Uhh, Just use /ket <prompt> to get a response.")
}

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
