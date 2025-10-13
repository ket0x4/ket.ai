package telegram

import (
	"ket/config"
	"ket/telegram/commands"
	"ket/telegram/handlers"
	"log"

	tele "gopkg.in/telebot.v4"
)

func InitBot() *tele.Bot {
	cfg := config.GetConfig()

	bot, err := NewBot(&cfg)
	if err != nil {
		log.Fatalf("Failed to create new bot: %v", err)
	}

	bot.Use(ignoreOldMessagesMiddleware(bot.botStartTime))

	log.Println("Telegram bot created successfully")

	handlers.InitPromptQueue(bot.cfg.BotSetup.MaxQueue)
	handlers.StartPromptWorker("default", bot.Bot)

	commands.RegisterBasicCommands(bot.Bot)
	commands.RegisterAdminCommands(bot.Bot)
	commands.RegisterRAGCommands(bot.Bot)
	commands.RegisterPromptCommand(bot.Bot)

	// Register inline handlers
	bot.Handle(&tele.InlineButton{Unique: "status_refresh"}, handlers.HandleStatusRefresh)
	bot.Handle(&tele.InlineButton{Unique: "model_select"}, handlers.HandleModelSelect)

	// Register text handler
	bot.Handle(tele.OnText, handlers.HandlePrompt)

	return bot.Bot
}

func Run() {
	bot := InitBot()

	log.Println("Application setup complete. Bot is initializing and starting...")
	go bot.Start()

	select {}
}
