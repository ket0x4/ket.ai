package telegram

import (
	"ket/utils"
	"ket/youtube"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// Handle /yt and /ytsum commands

func HandleYTCommand(c tele.Context) error {
	text := c.Message().Text
	//user := c.Sender().Username
	user := c.Sender().ID
	log.Printf("Received /yt command from %d", user)
	links := utils.DetectYT(text)

	// If no links are found, reply with an error message
	if len(links) == 0 {
		log.Printf("No YouTube links found for user %d.", user)
		return c.Send("No YouTube links found in the message.")
	}

	log.Printf("Found %d YouTube link(s) for user %d.", len(links), user)
	// Process each link and send a summary
	for _, link := range links {
		log.Printf("Processing link for %d: %s", user, link)
		summary, err := youtube.SummarizeYT(link)
		if err != nil {
			log.Printf("[Youtube] Error: %d: %v", user, err)
			if strings.Contains(err.Error(), "Sign in to confirm") {
				return c.Send("I am unable to get the transcript for this video. I'm likely blocked by YouTube. Please try again later.")
			}
			return c.Send("Error summarizing YouTube link: " + err.Error())
		}
		log.Printf("Successfully summarized link for %d: %s", user, link)
		c.Send(summary)
	}

	return nil
}
