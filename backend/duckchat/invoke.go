package duckchat

import "log"

// new function to return the response to the telegram bot
func DuckChat(prompt, model string) (string, error) {
	log.Printf("DuckChat called with model %s", model)
	prompt = Preprompt + prompt // inject preprompt
	result, err := ddgInvoke(prompt, model)
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}

	switch {
	case len(result) == 0:
		log.Println("No response from the model")
		return "No response from the model", nil
	case len(result) > 3500:
		log.Println("Response exceeds telegram message limit")
		return "Response too long", nil
	default:
		return result, nil
	}
}
