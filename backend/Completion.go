package backend

import (
	"context"
	"fmt"
	"ket/config"
	"log"

	openai "github.com/sashabaranov/go-openai"
)

type Service struct {
	client *openai.Client
	cfg    *config.Config
}

func NewService(cfg *config.Config) *Service {
	c := openai.DefaultConfig(cfg.BackendSetup.ApiKey)
	c.BaseURL = cfg.BackendSetup.ApiUrl
	client := openai.NewClientWithConfig(c)

	return &Service{
		client: client,
		cfg:    cfg,
	}
}

func (s *Service) GetResponse(ctx context.Context, prompt string, systemPrompt string) (string, error) {
	return s.generateResponse(ctx, prompt, systemPrompt)
}

func (s *Service) GetResponseWithCC(ctx context.Context, prompt string, contextPrompt string, systemPrompt string) (string, error) {
	// For context-aware requests, the user message is the contextPrompt (which includes history)
	// The original prompt is effectively wrapped in the contextPrompt
	return s.generateResponse(ctx, contextPrompt, systemPrompt)
}

func (s *Service) generateResponse(ctx context.Context, userMessage string, systemPrompt string) (string, error) {
	valid, errorMsg := CheckPrompt(userMessage)
	if !valid {
		log.Println(errorMsg)
		return "", fmt.Errorf("%s", errorMsg)
	}

	if systemPrompt == "default" || systemPrompt == "" {
		systemPrompt = s.cfg.BackendSetup.SysPrompt
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
		Content: userMessage,
	})

	resp, err := s.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    s.cfg.BackendSetup.Model,
			Messages: messages,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}

func (s *Service) FetchModels(ctx context.Context) ([]openai.Model, error) {
	models, err := s.client.ListModels(ctx)
	if err != nil {
		return nil, err
	}
	return models.Models, nil
}
