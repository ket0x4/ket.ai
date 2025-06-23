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

var system_prompt string

func init() {
	cfg = config.GetConfig()
	client = openai.NewClient(
		option.WithBaseURL(cfg.BackendSetup.ApiUrl),
		option.WithAPIKey(cfg.BackendSetup.ApiKey),
	)
	system_prompt = cfg.BackendSetup.SysPrompt
}

func GetResponse(ctx context.Context, prompt string) (string, error) {
	// Check prompt for empty or too long before processing
	valid, errorMsg := CheckPrompt(prompt)
	if !valid {
		log.Println(errorMsg)
		return "", fmt.Errorf("%s", errorMsg)
	}

	chatCompletion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(system_prompt),
			openai.UserMessage(prompt),
		},
		Model: openai.ChatModel(cfg.BackendSetup.Model),
	})
	if err != nil {
		return "", err
	}
	return chatCompletion.Choices[0].Message.Content, nil
}
