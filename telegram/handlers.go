package telegram

import (
	"context"
	"ket/random"
	"log"
	"strings"
	"time"

	tele "gopkg.in/telebot.v4"
)

func ignoreOldMessagesMiddleware(botStartTime time.Time) tele.MiddlewareFunc {
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

func HandleText(c tele.Context) error {
	if strings.HasPrefix(c.Message().Text, "/") {
		return nil
	}

	ok, err := random.LogMessage(c.Chat().ID, c.Sender().Username, c.Sender().ID, c.Message().Text)
	if err != nil {
		log.Printf("[AutoResponse] LogMessage error: %v", err)
	}
	if ok {
		log.Printf("[AutoResponse] Triggered for chat %d", c.Chat().ID)
		response, err := random.GenerateAutoResponse(context.Background(), c.Chat().ID)
		if err != nil {
			log.Printf("[AutoResponse] GenerateAutoResponse error: %v", err)
			return nil
		}
		_, sendErr := c.Bot().Send(c.Chat(), response)
		if sendErr != nil {
			log.Printf("[AutoResponse] Send error: %v", sendErr)
		}
	}
	return nil
}