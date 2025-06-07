package backend

import (
	"context"

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
