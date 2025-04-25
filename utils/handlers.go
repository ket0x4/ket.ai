package utils

import (
	"ket/backend/duckchat"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

func HandleHelp(c tele.Context) error {
	log.Println("/help command issued")
	return c.Reply("Uhh, Just use /ket <prompt> to get a response or idk do whatever you want")
}

func HandleStartCommad(c tele.Context) error {
	log.Println("/start command issued")
	return c.Reply(
		`This version of Ket.ai is still in development.
You can use @ketailegacy_bot to access the old version.`,
	)
}

func getResponse(prompt string) (string, error) {
	//remove /ket from the prompt if it exists
	prompt = strings.TrimPrefix(prompt, "/ket ")
	prompt = strings.TrimSpace(prompt)

	if strings.TrimSpace(prompt) == "" {
		return "Please provide a prompt.", nil
	}

	// Check if the prompt is too long
	if len(prompt) > 100 {
		return "Prompt too long. Please try a shorter prompt.", nil
	}

	// Invoke DuckChat API
	ret, info, err := duckchat.Quack(prompt, loadedConfig.DC_MODEL)
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}
	//log.Println(ret, info)
	_ = info

	ret = strings.TrimSpace(ret)
	if ret == "" {
		return "No response from the model. (Unreliable Network)", nil
	}
	if len(ret) > 4096 {
		return "Response too long. Please try a shorter prompt.", nil
	}
	return ret, nil
}

func HandlePrompt(c tele.Context) error {
	//log.Println("/ket command issued")
	text := c.Message().Text
	var args string
	if c.Message().ReplyTo != nil {
		args = c.Message().ReplyTo.Text
	} else {
		args = strings.TrimPrefix(text, "/ket ")
	}

	response, err := getResponse(args)
	if err != nil {
		return c.Send("Error: " + err.Error())
	}
	log.Println("User:", c.Message().Chat.ID, "Prompt:", args, ". Response:", response)

	return c.Reply(response, tele.ModeMarkdown)
}

/* listen message if not in group and reply with the response
func HandleMessage(c tele.Context) error {
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
*/
