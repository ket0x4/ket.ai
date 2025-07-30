package backend

import (
	"context"
	"fmt"
	"ket/config"
	"log"

	openai "github.com/sashabaranov/go-openai"
)

var client *openai.Client
var cfg config.Config

func init() {
	cfg = config.GetConfig()
	config := openai.DefaultConfig(cfg.BackendSetup.ApiKey)
	config.BaseURL = cfg.BackendSetup.ApiUrl
	client = openai.NewClientWithConfig(config)
}

func GetResponse(ctx context.Context, prompt string, systemPrompt string) (string, error) {
	valid, errorMsg := CheckPrompt(prompt)
	if !valid {
		log.Println(errorMsg)
		return "", fmt.Errorf("%s", errorMsg)
	}

	if systemPrompt == "" {
		systemPrompt = cfg.BackendSetup.SysPrompt
	}

	messages := make([]openai.ChatCompletionMessage, 0)
	if systemPrompt != "" {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		})
	}
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: prompt,
	})

	resp, err := client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    cfg.BackendSetup.Model,
			Messages: messages,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}

func GetResponseWithRAG(ctx context.Context, prompt string, contextPrompt string, systemPrompt string) (string, error) {
	valid, errorMsg := CheckPrompt(prompt)
	if !valid {
		log.Println(errorMsg)
		return "", fmt.Errorf("%s", errorMsg)
	}

	if systemPrompt == "" {
		systemPrompt = cfg.BackendSetup.SysPrompt
	}

	messages := make([]openai.ChatCompletionMessage, 0)
	if systemPrompt != "" {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		})
	}
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: contextPrompt,
	})

	resp, err := client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    cfg.BackendSetup.Model,
			Messages: messages,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}

func FetchModels(ctx context.Context) ([]openai.Model, error) {
	models, err := client.ListModels(ctx)
	if err != nil {
		return nil, err
	}
	return models.Models, nil
}