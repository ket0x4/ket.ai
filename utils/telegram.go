package utils

import (
	"log"
	"time"

	tele "gopkg.in/telebot.v4"
)

func InitBot() *tele.Bot {
	cfg := GetConfig()

	settings := tele.Settings{
		Token:  cfg.TOKEN,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}

	if settings.Token == "" {
		log.Println("BOT_TOKEN not set")
		return nil
	}

	bot, err := tele.NewBot(settings)
	if err != nil {
		log.Fatal(err)
		return nil
	}

	log.Println("Telegram bot created successfully")

	bot.Handle("/start", HandleStartCommad)
	bot.Handle("/help", HandleHelp)
	bot.Handle("/ket", HandlePrompt)
	bot.Handle("/status", HandleStatusCommand)
	//bot.Handle(tele.OnText, HandleMessage)
	return bot
}

func Start(bot *tele.Bot) {
	//log.Println("Listening for commands")
	bot.Start()
}
