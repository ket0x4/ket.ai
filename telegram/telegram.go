package telegram

import (
	"ket/config"
	"ket/utils"
	"log"
	"os"
	"time"

	tele "gopkg.in/telebot.v4"
)

func InitBot() *tele.Bot {
	cfg := config.GetConfig()

	settings := tele.Settings{
		Synchronous: false,
		ParseMode:   tele.ModeMarkdownV2,
		OnError: func(err error, c tele.Context) {
			// Log the error with context information
			log.Printf("Error in context %s: %v", c.Message().Text, err)
		},
		Token:  cfg.TOKEN,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}

	if settings.Token == "" {
		// If the token is not set, log an error and return nil
		log.Println("BOT_TOKEN not set")
		os.Exit(1)
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
	bot.Handle("/ket", HandlePrompt2)
	bot.Handle("/status", utils.HandleStatusCommand)
	//bot.Handle(tele.OnText, HandleMessage)

	/* Permission commands
	bot.Handle("/adduser", utils.HandleAddUserCommand)
	bot.Handle("/rmuser", utils.HandleRemoveUserCommand)
	bot.Handle("/addchat", utils.HandleAddChatCommand)
	bot.Handle("/rmchat", utils.HandleRemoveChatCommand)
	bot.Handle("/listusers", utils.HandleListUsersCommand)
	*/

	return bot
}

func Start(bot *tele.Bot) {
	bot.Start()
}

func Run() {
	var bot *tele.Bot
	for {
		bot = InitBot()
		if bot != nil {
			break
		}
		log.Println("Failed to initialize bot, retrying in 5 seconds...")
		time.Sleep(5 * time.Second)
	}
	go Start(bot)
	select {}
}
