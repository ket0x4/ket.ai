package telegram

import (
	"fmt"
	"log"

	tele "gopkg.in/telebot.v4"
)

// sendError is a helper function to send a formatted error message to the user and log it.
func sendError(c tele.Context, message string, err error) error {
	log.Printf("[FAIL] user:%d chat:%d | Error: %v", c.Sender().ID, c.Chat().ID, err)
	
	// Using ModeHTML to allow for better formatting.
	errorMsg := fmt.Sprintf("%s\n\n<b>Error:</b>\n<code>%v</code>", message, err)
	
	return c.Reply(errorMsg, tele.ModeHTML)
}

