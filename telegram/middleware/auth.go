package middleware

import (
	"ket/permissions"
	"log"

	tele "gopkg.in/telebot.v4"
)

// RequireAdmin checks if the sender is an admin.
func RequireAdmin(next tele.HandlerFunc) tele.HandlerFunc {
	return func(c tele.Context) error {
		if !permissions.IsAdmin(c.Sender().ID) {
			log.Printf("[DENY] Admin command | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
			return c.Reply("You are not authorized to use this command.")
		}
		return next(c)
	}
}

// RequireUser checks if the chat is allowed.
func RequireUser(next tele.HandlerFunc) tele.HandlerFunc {
	return func(c tele.Context) error {
		if !permissions.IsAllowed(c.Chat().ID) {
			log.Printf("[DENY] User command | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
			return c.Reply("You are not authorized to use this bot.")
		}
		return next(c)
	}
}
