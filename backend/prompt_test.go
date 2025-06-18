package backend

import (
	"testing"
)

func TestIsEmpty(t *testing.T) {
	if !isEmpty("   ") {
		t.Error("Expected true for whitespace string")
	}
	if isEmpty("not empty") {
		t.Error("Expected false for non-empty string")
	}
	if !isEmpty("") {
		t.Error("Expected true for empty string")
	}
}

func TestIsTooLong(t *testing.T) {
	if isTooLong("short", 10) {
		t.Error("Expected false for string shorter than max length")
	}
	if !isTooLong("this is too long", 10) {
		t.Error("Expected true for string longer than max length")
	}
	if isTooLong("just right", 10) {
		t.Error("Expected false for string equal to max length")
	}
}

func TestCheckPrompt(t *testing.T) {
	valid, msg := CheckPrompt("")
	if valid {
		t.Error("Expected false for empty prompt")
	}
	if msg != "Prompt is empty" {
		t.Error("Unexpected message for empty prompt:", msg)
	}

	longPrompt := ""
	for i := 0; i < 3001; i++ {
		longPrompt += "a"
	}
	valid, msg = CheckPrompt(longPrompt)
	if valid {
		t.Error("Expected false for long prompt")
	}
	if msg != "Prompt is too long (max 3000 characters)" {
		t.Error("Unexpected message for long prompt:", msg)
	}

	valid, msg = CheckPrompt("valid prompt")
	if !valid {
		t.Error("Expected true for valid prompt")
	}
	if msg != "" {
		t.Error("Unexpected message for valid prompt:", msg)
	}
}
