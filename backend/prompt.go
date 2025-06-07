package backend

import (
	"strings"
)

//var system_prompt = "You are a helpful assistant named Ket. always keep answers short. limit is 3000 char. User prompt is:"

// simple function to check if a string is empty
func isEmpty(s string) bool {
	return strings.TrimSpace(s) == ""
}

// simple function to check if a string is too long
func isTooLong(s string, maxLength int) bool {
	return len(s) > maxLength
}
