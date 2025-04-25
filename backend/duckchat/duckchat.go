package duckchat

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ResponseData represents the structure within each streamed line of the response
type ResponseData struct {
	Message string `json:"message,omitempty"`
}

func Quack(prompt, model string) (string, string, error) {
	// HTTP headers for the request
	headers := map[string]string{
		"User-Agent":      "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
		"Accept":          "text/event-stream",
		"Accept-Language": "en-US;q=0.7,en;q=0.3",
		"Referer":         "https://duckduckgo.com/",
		"Content-Type":    "application/json",
		"Origin":          "https://duckduckgo.com",
		"Cookie":          "dcm=1",
		"Cache-Control":   "no-store",
		"x-vqd-accept":    "1",
	}

	client := &http.Client{}
	start := time.Now()

	// Step 1: Retrieve token from x-vqd-4 header
	statusReq, err := http.NewRequest("GET", "https://duckduckgo.com/duckchat/v1/status", nil)
	if err != nil {
		return "", "", err
	}
	for k, v := range headers {
		statusReq.Header.Set(k, v)
	}

	statusResp, err := client.Do(statusReq)
	if err != nil {
		return "", "", err
	}
	defer statusResp.Body.Close()

	token := statusResp.Header.Get("x-vqd-4")
	if token == "" {
		return "", "", fmt.Errorf("failed to retrieve token from x-vqd-4 header")
	}
	headers["x-vqd-4"] = token

	// Step 2: Send POST request with model and prompt
	postBody := fmt.Sprintf(`{
		"model": "%s",
		"messages": [{"role": "user", "content": "%s"}]
	}`, model, strings.ReplaceAll(prompt, `"`, `\"`))

	req, err := http.NewRequest("POST", "https://duckduckgo.com/duckchat/v1/chat", strings.NewReader(postBody))
	if err != nil {
		return "", "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	// Step 3: Process the response, extracting all lines starting with JSON data
	var resultBuilder strings.Builder
	reader := bufio.NewReader(resp.Body)

	for {
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			return "", "", err
		}

		if len(line) > 6 && strings.HasPrefix(line, "data: ") {
			dataStr := line[6:]
			var responseData ResponseData
			if json.Unmarshal([]byte(dataStr), &responseData) == nil && responseData.Message != "" {
				cleanMsg := strings.ReplaceAll(responseData.Message, "\\n", "\n")
				resultBuilder.WriteString(cleanMsg)
			}
		}
		if err == io.EOF {
			break
		}
	}

	elapsed := time.Since(start).Seconds()
	info := fmt.Sprintf("\n\nTook: %.2fs | Model: %s", elapsed, model)

	return resultBuilder.String(), info, nil
}
