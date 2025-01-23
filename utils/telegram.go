package utils

import (
	"log"
	"time"

	tele "gopkg.in/telebot.v4"
)

var pref = tele.Settings{
	Token:  LoadToken(),
	Poller: &tele.LongPoller{Timeout: 10 * time.Second},
}

func InitBot() *tele.Bot {
	if pref.Token == "" {
		log.Println("BOT_TOKEN not set")
		return nil
	}

	Bot, err := tele.NewBot(pref)
	if err != nil {
		log.Fatal(err)
		return nil
	}

	log.Println("Telegram bot created successfully")

	Bot.Handle("/start", HandleStart)
	Bot.Handle("/help", HandleHelp)
	Bot.Handle("/ket", HandlePrompt)
	Bot.Handle(tele.OnText, HandleMessage)
	return Bot
}

func Start(bot *tele.Bot) {
	log.Println("Listening for commands")
	bot.Start()
}
