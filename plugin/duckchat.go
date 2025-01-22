package plugin

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

// Available models:
// Mixtral-8x7B-Instruct-v0.1
// Llama-3-70b-chat-hf
// claude-3-haiku-20240307
// gpt-3.5-turbo-0125
// gpt-4o-mini

// Preprompt
var Preprompt = "keep your response short & simple. api doesn't support >3500 chars. User prompt:"

var httpClient = &http.Client{}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type RequestData struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

/* text size limit check
func CharLimit(text string, limit int) bool {
	return len(text) > limit
}

*/

func ddgInvoke(prompt, model string) (string, error) {
	headers := map[string]string{
		"User-Agent":      "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
		"Accept":          "text/event-stream",
		"Accept-Language": "en-US;q=0.7,en;q=0.3",
		"Accept-Encoding": "gzip, deflate, br",
		"Referer":         "https://duckduckgo.com/",
		"Content-Type":    "application/json",
		"Origin":          "https://duckduckgo.com",
		"Connection":      "keep-alive",
		"Cookie":          "dcm=1",
		"Sec-Fetch-Dest":  "empty",
		"Sec-Fetch-Mode":  "cors",
		"Sec-Fetch-Site":  "same-origin",
		"Pragma":          "no-cache",
		"TE":              "trailers",
		"x-vqd-accept":    "1",
		"Cache-Control":   "no-store",
	}

	//startTime := time.Now()

	// Get token
	req, err := http.NewRequest("GET", "https://duckduckgo.com/duckchat/v1/status", nil)
	if err != nil {
		return "", err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	token := resp.Header.Get("x-vqd-4")
	if token == "" {
		return "", err
	}
	headers["x-vqd-4"] = token

	// Prepare request data
	data := RequestData{
		Model: model,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	// Send request
	req, err = http.NewRequest("POST", "https://duckduckgo.com/duckchat/v1/chat", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err = httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Process response
	ret := ""
	lines := bytes.Split(body, []byte("\n"))
	for _, line := range lines {
		if len(line) > 0 && line[6] == '{' {
			var dat map[string]interface{}
			if err := json.Unmarshal(line[6:], &dat); err != nil {
				return "", err
			}
			if message, ok := dat["message"].(string); ok {
				ret += message
			}
		}
	}

	//endTime := time.Now()
	//generationTime := endTime.Sub(startTime).Seconds()
	//Info := fmt.Sprintf("Took: `%.2fs` | Model: `%s`", generationTime, model)
	//Info := fmt.Sprintf("\n\nTook: `%.2fs` | Model: `%s`", generationTime, model)
	//return ret + Info, nil
	//log.Printf(Info)

	return ret, nil
}

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
