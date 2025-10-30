package telegram

import (
	"ket/chatcontext"
	"ket/config"
	"ket/telegram/commands"
	"ket/telegram/handlers"
	"log"
	"os"
	"os/signal"
	"syscall"

	tele "gopkg.in/telebot.v4"
)

func InitBot() *tele.Bot {
	cfg := config.GetConfig()
	bot, err := NewBot(&cfg)
	if err != nil {
		log.Fatalf("Failed to create new bot: %v", err)
	}

	// ignore previous messages
	bot.Use(ignoreOldMessagesMiddleware(bot.botStartTime))

	handlers.InitPromptQueue(bot.cfg.BotSetup.MaxQueue)
	handlers.StartPromptWorker("default", bot.Bot)

	// Register commands
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

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	<-stop

	log.Println("Shutting down...")
	bot.Stop()
	chatcontext.Close()
	log.Println("Bot stopped.")
}
