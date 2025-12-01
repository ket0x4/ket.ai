package middleware

import (
	"log"
	"time"

	tele "gopkg.in/telebot.v4"
)

func IgnoreOldMessagesMiddleware(botStartTime time.Time) tele.MiddlewareFunc {
	return func(next tele.HandlerFunc) tele.HandlerFunc {
		return func(c tele.Context) error {
			if c.Message() != nil {
				if c.Message().Time().Before(botStartTime) {
					log.Printf("Ignoring old message from %v", c.Message().Time())
					return nil
				}
			}
			return next(c)
		}
	}
}
