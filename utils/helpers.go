package utils

import (
	"regexp"
	"strings"
)

// Various helper functions for entire codebase

// DetectTY returns a list of links found in the given text
func DetectYT(text string) []string {
	re := regexp.MustCompile(`(https?://[^\s]+)`)
	matches := re.FindAllString(text, -1)
	var links []string
	for _, match := range matches {
		if strings.Contains(match, "youtube") {
			links = append(links, match)
		}
	}
	return links
}
