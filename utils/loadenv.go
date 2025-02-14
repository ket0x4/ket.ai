package utils

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadToken() string {
	if _, err := os.Stat(".env"); os.IsNotExist(err) {
		sample := "BOT_TOKEN='YourTokenHere'\n API_URL='http://127.0.0.1:8080'\n"
		os.WriteFile(".env", []byte(sample), 0644)
	}
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Could not load .env file")
	}
	return os.Getenv("BOT_TOKEN")
}
