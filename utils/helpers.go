package utils

import (
	"regexp"
)

// Various helper functions for entire codebase

// DetectYT returns a list of YouTube video links found in the given text.
// It specifically looks for youtube.com/watch?v= or youtu.be/ patterns.
func DetectYT(text string) []string {
	// Regex to find YouTube URLs (e.g., youtube.com/watch?v=... or youtu.be/...)
	// It matches http/https links followed by youtube.com/watch?v= or youtu.be/
	// and then any characters that are not whitespace, <, >, ", or '.
	// This helps in extracting clean URLs.
	re := regexp.MustCompile(`https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\\s<>"']+`)
	// FindAllString returns a slice of all successive non-overlapping matches of the regular expression.
	// If no matches are found, it returns nil, which is a valid empty slice in Go for []string.
	return re.FindAllString(text, -1)
}
