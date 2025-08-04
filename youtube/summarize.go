package youtube

// SummarizeYT takes a YouTube video link and returns a summary of its transcript.
import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/utils"
	"log"
	"strings"
)

func SummarizeYT(link string, systemPrompt string) (string, error) {
	sumPrompt := fmt.Sprintf("Summarize the following YouTube video transcript in %s Language. Skip intro, outro, sponsor segments. Make it concise and clear. and short. 3000 char limit. Transcript: ", config.GetConfig().BackendSetup.YtLanguage)
	videoID, err := utils.GetVideoID(link)
	if err != nil {
		return "", fmt.Errorf("failed to get video ID: %w", err)
	}

	ytClient, err := New()
	if err != nil {
		return "", fmt.Errorf("failed to create youtube client: %w", err)
	}

	tracks, err := ytClient.ListTranscripts(videoID)
	if err != nil {
		return "", fmt.Errorf("failed to list transcripts: %w", err)
	}
	if len(tracks) == 0 {
		return "", fmt.Errorf("no transcripts available for this video")
	}

	// Prefer English, otherwise take the first available track
	langCode := ""
	for _, track := range tracks {
		if track.LanguageCode == "en" {
			langCode = "en"
			break
		}
	}
	if langCode == "" {
		langCode = tracks[0].LanguageCode
		log.Printf("English transcript not found for %s, falling back to %s", videoID, langCode)
	}

	transcript, err := ytClient.GetTranscript(videoID, config.GetConfig().BackendSetup.YtLanguage)
	if err != nil {
		return "", fmt.Errorf("failed to get transcript: %w", err)
	}

	var transcriptText strings.Builder
	for _, text := range transcript.Texts {
		transcriptText.WriteString(text.Content)
		transcriptText.WriteString(" ")
	}

	fullPrompt := sumPrompt + transcriptText.String()

	summary, err := backend.GetResponse(context.Background(), fullPrompt, systemPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to get summary from backend: %w", err)
	}

	return summary, nil
}
