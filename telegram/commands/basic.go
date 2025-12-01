package commands

import (
	"ket/backend"
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterBasicCommands(b *tele.Bot, backendService *backend.Service) {
	b.Handle("/start", middleware.RequireUser(handlers.HandleStartCommand))
	b.Handle("/help", middleware.RequireUser(handlers.HandleHelp))
	b.Handle("/status", middleware.RequireUser(func(c tele.Context) error {
		return handlers.HandleStatus(c, backendService)
	}))
	b.Handle("/model", middleware.RequireAdmin(func(c tele.Context) error {
		return handlers.HandleModelCommand(c, backendService)
	}))
}
