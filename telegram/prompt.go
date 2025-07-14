package telegram

import (
	"fmt"
	"ket/config"
	"ket/permissions"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

type PromptTask struct {
	ChatID          int64
	UserID          int64
	Prompt          string
	TargetMessage   *tele.Message
	QueueMessage    *tele.Message
	OriginalContext tele.Context
}

var promptQueue chan *PromptTask
var MaxQueueSize = config.GetConfig().BotSetup.MaxQueue

func extractPromptDetails(c tele.Context) (promptText string, targetMessage *tele.Message, err error) {
	promptText = ""
	targetMessage = c.Message()

	if c.Message().IsReply() && c.Message().ReplyTo != nil && c.Message().ReplyTo.Text != "" {
		promptText = c.Message().ReplyTo.Text
		targetMessage = c.Message().ReplyTo
	} else {
		rawText := c.Message().Text
		cmdVariants := []string{config.GetConfig().GenCommand, "/" + config.GetConfig().GenCommand}
		for _, cmd := range cmdVariants {
			if strings.HasPrefix(rawText, cmd) {
				trimmedText := strings.TrimSpace(strings.TrimPrefix(rawText, cmd))
				if trimmedText != "" {
					promptText = trimmedText
					break
				}
			}
		}
	}

	if promptText == "" {
		return "", targetMessage, fmt.Errorf("prompt is empty")
	}

	return promptText, targetMessage, nil
}

func HandlePrompt2(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}

	promptText, targetMessage, err := extractPromptDetails(c)
	if err != nil {
		log.Printf("Prompt extraction failed for chat ID %d: %v", c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("The prompt is empty. Usage: /%s <your prompt> or reply to a message with /%s.", config.GetConfig().GenCommand, config.GetConfig().GenCommand))
	}

	task := &PromptTask{
		ChatID:          c.Chat().ID,
		UserID:          c.Sender().ID,
		Prompt:          promptText,
		TargetMessage:   targetMessage,
		OriginalContext: c,
	}

	select {
	case promptQueue <- task:
		queueLen := len(promptQueue)
		replyMsg := fmt.Sprintf("Your request has been queued <code>(position %d/%d)</code>", queueLen, MaxQueueSize)
		sentMsg, err := c.Bot().Reply(c.Message(), replyMsg, tele.ModeHTML)
		if err == nil {
			task.QueueMessage = sentMsg
		}
	default:
		return c.Reply("The bot is currently busy. Please try again in a few moments.")
	}

	return nil
}
