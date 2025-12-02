package commands

import (
	"ket/backend"
	"ket/config"
	"ket/random"
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterPromptCommand(b *tele.Bot, backendService *backend.Service, randomService *random.Service) {
	command := config.GenCommand
	b.Handle("/"+command, middleware.RequireUser(func(c tele.Context) error {
		return handlers.HandlePrompt(c, backendService, randomService)
	}))
}
