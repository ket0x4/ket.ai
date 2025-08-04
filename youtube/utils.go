package youtube

import (
	"regexp"
)

// DetectYT returns a list of YouTube video links found in the given text.
// It specifically looks for youtube.com/watch?v= or youtu.be/ patterns.
func DetectYT(text string) []string {
	// Regex to find YouTube URLs (e.g., youtube.com/watch?v=... or youtu.be/...)
	// It matches http/https links followed by youtube.com/watch?v= or youtu.be/
	// and then any characters that are not whitespace, <, >, ", or '.
	// This helps in extracting clean URLs.
	re := regexp.MustCompile(`https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[^\s<>"']+`)
	// FindAllString returns a slice of all successive non-overlapping matches of the regular expression.
	// If no matches are found, it returns nil, which is a valid empty slice in Go for []string.
	return re.FindAllString(text, -1)
}

// GetVideoID extracts the YouTube video ID from a given YouTube URL.
func GetVideoID(url string) (string, error) {
	re := regexp.MustCompile(`(?:youtube\.com/watch\?v=|youtu\.be/)([^&?]+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1], nil
	}
	return "", &urlError{url: url}
}

type urlError struct {
	url string
}

func (e *urlError) Error() string {
	return "invalid or unsupported YouTube URL: " + e.url
}
