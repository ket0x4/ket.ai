package commands

import (
	"ket/chatcontext"
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterRAGCommands(b *tele.Bot, ccService *chatcontext.Service) {
	b.Handle("/history", middleware.RequireUser(func(c tele.Context) error {
		return handlers.HandleRAGHistory(c, ccService)
	}))
	b.Handle("/reset", middleware.RequireUser(func(c tele.Context) error {
		return handlers.HandleRAGClear(c, ccService)
	}))
}
