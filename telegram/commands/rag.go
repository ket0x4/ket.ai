package commands

import (
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterRAGCommands(b *tele.Bot) {
	b.Handle("/history", middleware.RequireUser(handlers.HandleRAGHistory))
	b.Handle("/reset", middleware.RequireUser(handlers.HandleRAGClear))
}
