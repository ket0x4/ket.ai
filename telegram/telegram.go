package telegram

import (
	"ket/backend"
	"ket/chatcontext"
	"ket/config"
	"ket/random"
	"ket/telegram/commands"
	"ket/telegram/handlers"
	"ket/telegram/middleware"
	"log"
	"os"
	"os/signal"
	"syscall"

	tele "gopkg.in/telebot.v4"
)

func InitBot() (*tele.Bot, *chatcontext.Service) {
	cfg := config.GetConfig()

	// Initialize services
	backendService := backend.NewService(&cfg)
	chatContextService := chatcontext.NewService(backendService)
	randomService := random.NewService(chatContextService, backendService)

	bot, err := NewBot(&cfg)
	if err != nil {
		log.Fatalf("Failed to create new bot: %v", err)
	}

	// ignore previous messages
	bot.Use(middleware.IgnoreOldMessagesMiddleware(bot.botStartTime))

	handlers.InitPromptQueue(bot.cfg.BotSetup.MaxQueue)
	handlers.StartPromptWorker("default", bot.Bot, chatContextService, backendService)

	// Register commands
	commands.RegisterBasicCommands(bot.Bot, backendService)
	commands.RegisterAdminCommands(bot.Bot)
	commands.RegisterRAGCommands(bot.Bot, chatContextService)
	commands.RegisterPromptCommand(bot.Bot, backendService, randomService)

	// Register inline handlers
	bot.Handle(&tele.InlineButton{Unique: "status_refresh"}, func(c tele.Context) error {
		return handlers.HandleStatusRefresh(c, backendService)
	})
	bot.Handle(&tele.InlineButton{Unique: "model_select"}, func(c tele.Context) error {
		return handlers.HandleModelSelect(c, backendService)
	})

	// Register text handler
	bot.Handle(tele.OnText, func(c tele.Context) error {
		return handlers.HandlePrompt(c, backendService, randomService)
	})

	return bot.Bot, chatContextService
}

func Run() {
	bot, chatContextService := InitBot()

	log.Println("Application setup complete. Bot is initializing and starting...")
	go bot.Start()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	<-stop

	log.Println("Shutting down...")
	bot.Stop()
	chatContextService.Close()
	log.Println("Bot stopped.")
}
