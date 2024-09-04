package main

import (
	"fmt"
	"ket/plugin/duckchat"
	"ket/utils/telegram"
)

func main() {
	fmt.Println("Started")
	duckchat.DuckChat("Hello, DuckChat!", "gpt-4o-mini")
	telegram.SendStartMessage()
}
