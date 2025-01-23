package main

import (
	"io"
	"ket/utils"
	"log"
	"os"
)

func init() {
	// Initialize the logger
	log.Println("Starting Ket.ai Bot")
	logFile, err := os.OpenFile("ket.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0666)
	if err != nil {
		log.Fatal(err)
	}
	mw := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(mw)
}

func main() {
	// Initialize the telegram bot
	bot := utils.InitBot()
	go utils.Start(bot)
	// Keep the main thread running
	select {}
}
