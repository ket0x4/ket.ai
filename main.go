package main

import (
	"ket/telegram"
)

func init() {
	// Logging and configuration are automatically initialized by the
	// config package's init function
}

func main() {

	telegram.Run()
}

/*
To-do:
- Implement error handling for network requests
- Add support for autostarting the llama-server if not running
- Implement a command to restart the llama-server
- Add support for multimodal inputs (images, audio)
*/
