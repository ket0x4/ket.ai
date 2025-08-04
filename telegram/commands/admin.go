package commands

import (
	"ket/telegram/handlers"
	"ket/telegram/middleware"

	tele "gopkg.in/telebot.v4"
)

func RegisterAdminCommands(b *tele.Bot) {
	adminGroup := b.Group()
	adminGroup.Use(middleware.RequireAdmin)

	adminGroup.Handle("/adduser", handlers.HandleAddUser)
	adminGroup.Handle("/rmuser", handlers.HandleRemoveUser)
	adminGroup.Handle("/addchat", handlers.HandleAddChat)
	adminGroup.Handle("/rmchat", handlers.HandleRemoveChat)
	adminGroup.Handle("/list", handlers.HandleList)
}
