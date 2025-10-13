package commands

import (
	"ket/config"
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterPromptCommand(b *tele.Bot) {
	genCommand := config.GenCommand
	b.Handle("/"+genCommand, middleware.RequireUser(handlers.HandlePrompt))
}
