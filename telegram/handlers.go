package telegram

import (
	"ket/backend"
	"log"

	tele "gopkg.in/telebot.v4"
)

func HandleHelp(c tele.Context) error {
	log.Println("User:", c.Message().Chat.ID, "requested help")
	return c.Send("Uhh, Just use /ket <prompt> to get a response.")
}

func HandleStartCommand(c tele.Context) error {
	log.Println("User:", c.Message().Chat.ID, "started the bot")
	return c.Send(
		`This version of Ket.ai is still in development.
You can use @ketailegacy_bot to access the old version.`,
	)
}

// This function is now unused and will be removed. Better function used in prompt.go
/*
func HandlePrompt(c tele.Context) error {
	text := c.Message().Text
	var args string
	if c.Message().ReplyTo != nil {
		args = c.Message().ReplyTo.Text
	} else {
		args = strings.TrimPrefix(text, "/ket ")
	}

	response, err := backend.GetResponse(args, dcModel)
	if err != nil {
		return c.Send("Error: " + err.Error())
	}

	log.Println("User:", c.Message().Chat.ID, "Prompt:", args, ". Response:", response)
	return c.Send(response, tele.ModeMarkdown)
}
*/

// HandleMessage handles all text messages
func HandleMessage(c tele.Context) error {
	if c.Message().Chat.Type == tele.ChatPrivate {
		text := c.Message().Text
		response, err := backend.GetResponse(text)
		if err != nil {
			return c.Send("Error: " + err.Error())
		}
		log.Println("User:", c.Message().Chat.ID, "Message:", text, ". Response:", response)
		return c.Send(response, tele.ModeMarkdown)
	}
	return nil
}
