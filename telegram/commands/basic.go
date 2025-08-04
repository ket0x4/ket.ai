package commands

import (
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterBasicCommands(b *tele.Bot) {
	b.Handle("/start", middleware.RequireUser(handlers.HandleStartCommand))
	b.Handle("/help", middleware.RequireUser(handlers.HandleHelp))
	b.Handle("/status", middleware.RequireUser(handlers.HandleStatus))
	b.Handle("/model", middleware.RequireAdmin(handlers.HandleModelCommand))
}
