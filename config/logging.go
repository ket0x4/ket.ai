package config

import (
	"io"
	"log"
	"os"
)

func init() {
	// Initialize the logger
	log.Println("Starting Ket.ai Next")
	logFile, err := os.OpenFile("dave.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0666)
	if err != nil {
		log.Fatal(err)
	}
	mw := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(mw)
}
