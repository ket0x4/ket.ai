package telegram

import (
	"ket/backend"
	"log"

	tele "gopkg.in/telebot.v4"
)

// var dcModel = config.GetDCModel()
var Text string

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
		//isReply = true
	} else {
		prompt = c.Message().Text
	}

	// Get the response from the backend
	response, err := backend.GetResponse(prompt, dcModel)
	if err != nil {
		return c.Send("Error: " + err.Error())
	}
	// Log the user ID, prompt, and response
	log.Println("User:", c.Message().Chat.ID, "Prompt:", prompt, ". Response:", response)
	_, err = c.Bot().Reply(repliedMsg, response, tele.ModeMarkdown)
	return err
}

// to-do: handle /ket without reply
// to-do: handle /ket <model> <text>
// to-do: Use tele.options to set default send options
