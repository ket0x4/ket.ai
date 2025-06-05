package telegram

import (
	"ket/backend"
	"log"

	tele "gopkg.in/telebot.v4"
)

// var dcModel = config.GetDCModel()
var Text string

// to-do: Reduce repetition of code

func HandlePrompt2(c tele.Context) error {
	// Get the text from the message
	var repliedMsg *tele.Message
	prompt := c.Message().Text
	// Check if the message is a reply
	if c.Message().ReplyTo != nil {
		// Get the text from the replied message
		repliedMsg = c.Message().ReplyTo
		repliedText := repliedMsg.Text
		prompt = repliedText

		// get response from backend
		response, err := backend.GetResponse(prompt)
		if err != nil {
			log.Panicln("Error:", err)
			return c.Reply("Error: " + err.Error())
		}
		// Log the user ID, prompt, and response
		log.Println("User:", c.Message().Chat.ID, "Prompt:", prompt, ". Response:", response)

		// Send the response to the user
		_, err = c.Bot().Reply(repliedMsg, response, tele.ModeMarkdown)

	} else {
		prompt = c.Message().Text

		// get response from backend
		response, err := backend.GetResponse(prompt)
		if err != nil {
			log.Println("Error:", err)
			return c.Reply("Error: " + err.Error())
		}

		// Log the user ID, prompt, and response
		log.Println("User:", c.Message().Chat.ID, "Prompt:", prompt, ". Response:", response)

		// Send the response to the user
		_, err = c.Bot().Reply(c.Message(), response, tele.ModeMarkdown)
	}

	return nil
}
