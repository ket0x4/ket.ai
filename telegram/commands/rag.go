package commands

import (
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterRAGCommands(b *tele.Bot) {
	b.Handle("/raghistory", middleware.RequireUser(handlers.HandleRAGHistory))
	b.Handle("/rh", middleware.RequireUser(handlers.HandleRAGHistory))
	b.Handle("/ragclear", middleware.RequireUser(handlers.HandleRAGClear))
	b.Handle("/rc", middleware.RequireUser(handlers.HandleRAGClear))
}
