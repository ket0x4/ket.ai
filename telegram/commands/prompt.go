package commands

import (
	"ket/config"
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterPromptCommand(b *tele.Bot) {
	command := config.GenCommand
	b.Handle("/"+command, middleware.RequireUser(handlers.HandlePrompt))
}
