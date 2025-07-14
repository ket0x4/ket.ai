package telegram

import (
	"context"
	"ket/backend"
	"ket/config"
	"ket/rag"
	"log"
	"time"

	tele "gopkg.in/telebot.v4"
)

var botStartTime time.Time

func ignoreOldMessagesMiddleware(next tele.HandlerFunc) tele.HandlerFunc {
	return func(c tele.Context) error {
		if c.Message() != nil {
			if c.Message().Time().Before(botStartTime) {
				log.Printf("Ignoring old message from %v", c.Message().Time())
				return nil
			}
		}
		return next(c)
	}
}

func processPrompt(task *PromptTask, systemPrompt string) {
	log.Printf("Processing prompt for chat ID %d from queue.", task.ChatID)

	response, err := rag.GetRagResponse(context.Background(), task.Prompt, task.ChatID, task.UserID, task.OriginalContext.Sender().Username, systemPrompt)
	if err != nil {
		log.Printf("Error getting RAG response for chat ID %d: %v", task.ChatID, err)
		response, err = backend.GetResponse(context.Background(), task.Prompt, systemPrompt)
		if err != nil {
			log.Printf("Error getting fallback response from backend for chat ID %d: %v", task.ChatID, err)
			_, replyErr := task.OriginalContext.Bot().Reply(task.TargetMessage, "Error processing your request: "+err.Error())
			if replyErr != nil {
				log.Printf("Error sending error reply to chat ID %d: %v", task.ChatID, replyErr)
			}
			return
		}
	}

	log.Printf("User: %d, Prompt: %s.", task.ChatID, task.Prompt)

	_, sendErr := task.OriginalContext.Bot().Reply(task.TargetMessage, response)
	if sendErr != nil {
		log.Printf("Error sending response to chat ID %d: %v", task.ChatID, sendErr)
	}
	log.Printf("Successfully sent response to chat ID %d.", task.ChatID)

	if task.QueueMessage != nil {
		err := task.OriginalContext.Bot().Delete(task.QueueMessage)
		if err != nil {
			log.Printf("Failed to delete queue message %d in chat %d: %v", task.QueueMessage.ID, task.ChatID, err)
		}
	}
}

func startPromptWorker(systemPrompt string) {
	promptQueue = make(chan *PromptTask, MaxQueueSize)
	go func() {
		for task := range promptQueue {
			processPrompt(task, systemPrompt)
		}
	}()
	log.Println("Prompt processing worker started.")
}

func InitBot() *tele.Bot {
	botStartTime = time.Now()
	cfg := config.GetConfig()

	settings := tele.Settings{
		Synchronous: false,
		Updates:     5,
		ParseMode:   tele.ModeMarkdown,
		Poller:      &tele.LongPoller{Timeout: 10 * time.Second},
		OnError: func(err error, c tele.Context) {
			if c != nil && c.Message() != nil {
				log.Printf("Error in context for message '%s': %v", c.Message().Text, err)
			} else {
				log.Printf("Error with nil context or message: %v", err)
			}
		},
		Token: cfg.BotSetup.Token,
	}

	if settings.Token == "" {
		log.Fatalf("BOT_TOKEN not set")
	}

	bot, err := tele.NewBot(settings)
	if err != nil {
		log.Fatalf("Failed to create new bot: %v", err)
	}

	bot.Use(ignoreOldMessagesMiddleware)

	log.Println("Telegram bot created successfully")

	startPromptWorker("")

	RegisterCommands(bot)
	RegisterInlineHandlers(bot)
	RegisterTextHandler(bot)

	return bot
}

func Start(bot *tele.Bot) {
	if bot == nil {
		log.Println("Bot is nil, cannot start.")
		return
	}
	log.Println("Starting bot polling...")
	bot.Start()
	log.Println("Bot stopped polling.")
}

func Run() {
	bot := InitBot()

	log.Println("Application setup complete. Bot is initializing and starting...")
	go Start(bot)

	select {}
}
