package backend

import (
	"log"
	"strings"
)

var system_prompt = "You are a helpful assistant named Ket. always keep anwsers short. limit is 3000 char. User prompt is:"

func GetResponse(prompt string) (string, error) {
	// Remove /ket from the prompt if it exists
	prompt = strings.TrimPrefix(prompt, "/ket ")
	prompt = strings.TrimSpace(prompt)
	prompt = system_prompt + prompt

	if strings.TrimSpace(prompt) == "" {
		return "Please provide a prompt.", nil
	}

	// Check if the prompt is too long
	if len(prompt) > 1000 {
		return "Prompt too long. Please try a shorter prompt.", nil
	}

	// Invoke Prompt
	ret, info, err := InvokePrompt(prompt)
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}
	_ = info
	ret = strings.TrimSpace(ret)
	if ret == "" {
		return "No response from the model.", nil
	}
	if len(ret) > 4000 {
		return "Response too long. Please try a shorter prompt.", nil
	}
	return ret, nil
}
