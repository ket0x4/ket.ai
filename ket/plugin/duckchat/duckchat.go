package duckchat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Available models:
// Mixtral-8x7B-Instruct-v0.1
// Llama-3-70b-chat-hf
// claude-3-haiku-20240307
// gpt-3.5-turbo-0125
// gpt-4o-mini

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type RequestData struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

func ddgInvoke(prompt, model string) (string, error) {
	client := &http.Client{}
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

	startTime := time.Now()

	// Get token
	req, err := http.NewRequest("GET", "https://duckduckgo.com/duckchat/v1/status", nil)
	if err != nil {
		return "", err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	token := resp.Header.Get("x-vqd-4")
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

	resp, err = client.Do(req)
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

	endTime := time.Now()
	generationTime := endTime.Sub(startTime).Seconds()
	info := fmt.Sprintf("\n\nTook: `%.2fs` | Model: `%s`", generationTime, model)

	return ret + info, nil
}

func DuckChat(prompt, model string) {
	result, err := ddgInvoke(prompt, model)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(result)
}
