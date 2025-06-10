package telegram

import (
	"context"
	"ket/backend"
	"ket/permissions" // Added import for utils package
	"log"

	tele "gopkg.in/telebot.v4"
)

// var dcModel = config.GetDCModel()
var Text string

// to-do: Reduce repetition of code

func HandlePrompt2(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}

	// Get the text from the message
	var repliedMsg *tele.Message
	prompt := c.Message().Text
	targetMessage := c.Message()

	// Check if the message is a reply
	if c.Message().ReplyTo != nil {
		// Get the text from the replied message
		repliedMsg = c.Message().ReplyTo
		prompt = repliedMsg.Text
		targetMessage = repliedMsg
	}

	// get response from backend
	response, err := backend.GetResponse(context.Background(), prompt)
	if err != nil {
		log.Println("Error:", err)
		return c.Reply("Error: " + err.Error())
	}
	// Log the user ID, prompt, and response
	log.Println("User:", c.Message().Chat.ID, "Prompt:", prompt, ". Response:", response)

	// Send the response to the user
	_, err = c.Bot().Reply(targetMessage, response)
	if err != nil {
		return err
	}

	return nil
}
