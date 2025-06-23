package youtube

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/http/cookiejar"
	"regexp"
	"strings"
)

const (
	watchURL        = "https://www.youtube.com/watch?v="
	innertubeAPIURL = "https://www.youtube.com/youtubei/v1/player?key="
)

// CaptionTrack defines the structure for a caption track from the YouTube API.
type CaptionTrack struct {
	BaseURL      string `json:"baseUrl"`
	Name         Name   `json:"name"`
	LanguageCode string `json:"languageCode"`
	Kind         string `json:"kind"` // "asr" for automatic speech recognition, "manual" for manually created captions.
}

// Name represents the name of a caption track.
type Name struct {
	SimpleText string `json:"simpleText"`
}

// PlayerResponse represents the structure of the JSON response from the InnerTube API.
type PlayerResponse struct {
	Captions struct {
		PlayerCaptionsTracklistRenderer struct {
			CaptionTracks []CaptionTrack `json:"captionTracks"`
		} `json:"playerCaptionsTracklistRenderer"`
	} `json:"captions"`
	PlayabilityStatus struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	} `json:"playabilityStatus"`
}

// Transcript represents the structure of the final XML transcript file.
type Transcript struct {
	XMLName xml.Name `xml:"transcript"`
	Texts   []Text   `xml:"text"`
}

// Text represents a single line of text in the transcript.
type Text struct {
	Start    float64 `xml:"start,attr"`
	Duration float64 `xml:"dur,attr"`
	Content  string  `xml:",chardata"`
}

// Regular expressions
var (
	apiKeyRegex  = regexp.MustCompile(`"INNERTUBE_API_KEY":"([^"]+)"`)
	htmlTagRegex = regexp.MustCompile(`<[^>]*>`)
)

// Client is a client for fetching YouTube transcripts.
type Client struct {
	httpClient *http.Client
}

// New creates a new Client.
func New() (*Client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create cookie jar: %w", err)
	}
	return &Client{
		httpClient: &http.Client{Jar: jar},
	}, nil
}

// ListTranscripts fetches and returns the available transcript tracks for a given video ID.
func (c *Client) ListTranscripts(videoID string) ([]CaptionTrack, error) {
	playerResponse, err := c.getPlayerResponse(videoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get player response: %w", err)
	}
	return playerResponse.Captions.PlayerCaptionsTracklistRenderer.CaptionTracks, nil
}

// GetTranscript fetches the transcript for a given video ID and language code.
// If languageCode is empty, it will fetch the first available transcript.
func (c *Client) GetTranscript(videoID string, languageCode string) (*Transcript, error) {
	tracks, err := c.ListTranscripts(videoID)
	if err != nil {
		return nil, fmt.Errorf("failed to list transcripts: %w", err)
	}

	if len(tracks) == 0 {
		return nil, fmt.Errorf("no transcripts available for this video")
	}

	targetTrack, err := findTrack(tracks, languageCode)
	if err != nil {
		return nil, err
	}

	transcriptXML, err := c.fetchURL(targetTrack.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transcript xml: %w", err)
	}

	var transcript Transcript
	if err := xml.Unmarshal([]byte(transcriptXML), &transcript); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transcript xml: %w", err)
	}

	cleanTranscript(&transcript)
	return &transcript, nil
}

func findTrack(tracks []CaptionTrack, languageCode string) (CaptionTrack, error) {
	if languageCode == "" {
		return tracks[0], nil
	}
	for _, track := range tracks {
		if track.LanguageCode == languageCode {
			return track, nil
		}
	}
	return CaptionTrack{}, fmt.Errorf("transcript for language '%s' not found", languageCode)
}

func cleanTranscript(transcript *Transcript) {
	for i := range transcript.Texts {
		cleanText := html.UnescapeString(transcript.Texts[i].Content)
		cleanText = htmlTagRegex.ReplaceAllString(cleanText, "")
		transcript.Texts[i].Content = strings.TrimSpace(cleanText)
	}
}

func (c *Client) getPlayerResponse(videoID string) (*PlayerResponse, error) {
	htmlContent, err := c.fetchURL(watchURL + videoID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch video page: %w", err)
	}

	if strings.Contains(htmlContent, "Sign in to confirm you’re not a bot") {
		return nil, fmt.Errorf("youtube requires sign-in to prove you're not a bot, please try again later")
	}

	apiKey, err := extractAPIKey(htmlContent)
	if err != nil {
		return nil, err
	}

	return c.fetchPlayerResponse(videoID, apiKey)
}

func extractAPIKey(htmlContent string) (string, error) {
	matches := apiKeyRegex.FindStringSubmatch(htmlContent)
	if len(matches) < 2 {
		return "", fmt.Errorf("could not find INNERTUBE_API_KEY")
	}
	return matches[1], nil
}

func (c *Client) fetchPlayerResponse(videoID, apiKey string) (*PlayerResponse, error) {
	innertubePayload := map[string]interface{}{
		"context": map[string]interface{}{
			"client": map[string]interface{}{
				"clientName":    "WEB",
				"clientVersion": "2.20210721.00.00",
				"hl":            "en",
				"gl":            "US",
			},
		},
		"videoId": videoID,
	}

	payloadBytes, err := json.Marshal(innertubePayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal innertube payload: %w", err)
	}

	req, err := http.NewRequest("POST", innertubeAPIURL+apiKey, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create innertube request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to post to innertube api: %w", err)
	}
	defer resp.Body.Close()

	var playerResponse PlayerResponse
	if err := json.NewDecoder(resp.Body).Decode(&playerResponse); err != nil {
		return nil, fmt.Errorf("failed to decode player response: %w", err)
	}

	if playerResponse.PlayabilityStatus.Status != "OK" {
		return nil, fmt.Errorf("video not playable: %s", playerResponse.PlayabilityStatus.Reason)
	}

	return &playerResponse, nil
}

func (c *Client) fetchURL(url string) (string, error) {
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("bad status: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}
