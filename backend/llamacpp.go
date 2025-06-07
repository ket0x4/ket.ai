package backend

import (
	"context"
	"fmt"
	"log"

	"ket/config"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

var client openai.Client
var cfg config.Config

func init() {
	cfg = config.GetConfig()
	client = openai.NewClient(
		option.WithBaseURL(cfg.API_URL+"/v1"),
		option.WithAPIKey(cfg.API_KEY),
	)
}

func GetResponse(prompt string) (string, error) {
	// Check prompt for empty or too long before processing
	valid, errorMsg := CheckPrompt(prompt)
	if !valid {
		log.Println(errorMsg)
		return "", fmt.Errorf("%s", errorMsg)
	}

	chatCompletion, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
		Model: openai.ChatModel(cfg.MODEL),
	})
	if err != nil {
		return "", err
	}
	return chatCompletion.Choices[0].Message.Content, nil
}
