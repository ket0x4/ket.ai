package backend

import (
	"strings"
)

// simple function to check if a string is empty
func isEmpty(s string) bool {
	return strings.TrimSpace(s) == ""
}

// simple function to check if a string is too long
func isTooLong(s string, maxLength int) bool {
	return len(s) > maxLength
}

// check prompt for empty or too long
func CheckPrompt(prompt string) (bool, string) {
	if isEmpty(prompt) {
		return false, "Prompt is empty"
	}
	if isTooLong(prompt, 3000) {
		return false, "Prompt is too long (max 3000 characters)"
	}
	return true, ""
}
