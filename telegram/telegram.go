package telegram

import (
	"ket/config"
	"ket/utils"
	"log"
	"time"

	tele "gopkg.in/telebot.v4"
)

func InitBot() *tele.Bot {
	cfg := config.GetConfig()

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

	bot.Handle("/start", HandleStartCommand)
	bot.Handle("/help", HandleHelp)
	bot.Handle("/ket", HandlePrompt)
	bot.Handle("/status", utils.HandleStatusCommand)
	//bot.Handle(tele.OnText, HandleMessage)
	return bot
}

func Start(bot *tele.Bot) {
	bot.Start()
}

func Run() {
	bot := InitBot()
	go Start(bot)
	select {}
}
