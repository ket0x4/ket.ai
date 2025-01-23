package utils

import (
	"ket/plugin"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

func HandleStart(c tele.Context) error {
	log.Println("Handling /start command")
	return c.Reply("work in progress")
}

func HandleHelp(c tele.Context) error {
	log.Println("Handling /help command")
	return c.Reply("Uhh, Just use /ket <prompt> to get a response or idk do whatever you want")
}

func getResponse(text string) (string, error) {
	response, err := plugin.DuckChat(text, "gpt-4o-mini")
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}
	return response, nil
}

func HandlePrompt(c tele.Context) error {
	log.Println("Handling /ket command")
	text := c.Message().Text
	userid := c.Message().Chat.ID
	args := strings.TrimPrefix(text, "/ket ")

	response, err := getResponse(args)
	if err != nil {
		return c.Send("Error: " + err.Error())
	}
	log.Println("User:", userid, "Prompt:", args, "Response:", response)

	return c.Reply(response, tele.ModeMarkdown)
}

// listen message if not in group and reply with the response
func HandleMessage(c tele.Context) error {
	log.Println("Listening for messages")
	if c.Message().Chat.Type == tele.ChatPrivate {
		text := c.Message().Text
		userid := c.Message().Chat.ID
		response, err := getResponse(text)
		if err != nil {
			return c.Send("Error: " + err.Error())
		}
		log.Println("User:", userid, ", Prompt:", text, ", Response:", response)

		//response = response + duckchat.Info
		return c.Send(response, tele.ModeMarkdown)
	}
	return nil
}
