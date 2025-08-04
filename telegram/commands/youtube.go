package commands

import (
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterYouTubeCommands(b *tele.Bot) {
	b.Handle("/yt", middleware.RequireUser(handlers.HandleYTCommand))
	b.Handle("/ytsum", middleware.RequireUser(handlers.HandleYTCommand))
	b.Handle("/youtube", middleware.RequireUser(handlers.HandleYTCommand))
}
