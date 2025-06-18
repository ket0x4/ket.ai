package telegram

import (
	"context"
	"ket/backend"
	"ket/config"
	"ket/utils"
	"log"
	"strings"
	"time"

	tele "gopkg.in/telebot.v4"
)

// processPrompt is the worker function that processes prompts from the queue.
func processPrompt(task *PromptTask) {
	log.Printf("Processing prompt for chat ID %d from queue.", task.ChatID)

	// Get response from backend
	response, err := backend.GetResponse(context.Background(), task.Prompt)
	if err != nil {
		log.Printf("Error getting response from backend for chat ID %d: %v", task.ChatID, err)
		// Use OriginalContext to reply with the error
		_, replyErr := task.OriginalContext.Bot().Reply(task.TargetMessage, "Error processing your request: "+err.Error())
		if replyErr != nil {
			log.Printf("Error sending error reply to chat ID %d: %v", task.ChatID, replyErr)
		}
		return
	}

	// Log the user ID, prompt, and response
	log.Printf("User: %d, Prompt: %s.", task.ChatID, task.Prompt)
	// This might be too verbose for production. to-do: log the response and prompt in a sql database
	// Uncomment the next line if you want to log the response for debugging
	// log.Printf("Response received for chat ID %d: %s", task.ChatID, response)

	// Send the response to the user using OriginalContext
	_, sendErr := task.OriginalContext.Bot().Reply(task.TargetMessage, response)
	if sendErr != nil {
		log.Printf("Error sending response to chat ID %d: %v", task.ChatID, sendErr)
	}
	log.Printf("Successfully sent response to chat ID %d.", task.ChatID)

	// After sending the response, delete the queue message
	if task.QueueMessage != nil {
		err := task.OriginalContext.Bot().Delete(task.QueueMessage)
		if err != nil {
			log.Printf("Failed to delete queue message %d in chat %d: %v", task.QueueMessage.ID, task.ChatID, err)
		}
	}
}

// startPromptWorker initializes and starts the prompt processing worker.
func startPromptWorker() {
	// promptQueue is declared in prompt.go and is a package-level variable.
	// MaxQueueSize is also defined in prompt.go.
	promptQueue = make(chan *PromptTask, MaxQueueSize) // Initialize the queue
	go func() {
		for task := range promptQueue {
			processPrompt(task) // Process one prompt at a time
		}
	}()
	log.Println("Prompt processing worker started.")
}

func InitBot() *tele.Bot {
	cfg := config.GetConfig()

	settings := tele.Settings{
		Synchronous: false,
		//ParseMode:   tele.ModeMarkdown,
		// Causes issues with some messages, so we use the default mode
		OnError: func(err error, c tele.Context) {
			// Log the error with context information
			if c != nil && c.Message() != nil {
				log.Printf("Error in context for message '%s': %v", c.Message().Text, err)
			} else {
				log.Printf("Error with nil context or message: %v", err)
			}
		},
		Token:  cfg.TOKEN,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}

	if settings.Token == "" {
		// If the token is not set, log an error and exit
		log.Fatalf("BOT_TOKEN not set") // Changed to log.Fatalf and removed os.Exit(1)
	}

	bot, err := tele.NewBot(settings)
	if err != nil {
		log.Fatalf("Failed to create new bot: %v", err) // Changed to log.Fatalf
	}

	log.Println("Telegram bot created successfully")

	// Initialize and start the prompt worker before setting up handlers
	startPromptWorker() // Call to start the worker

	bot.Handle("/start", HandleStartCommand)
	bot.Handle("/help", HandleHelp)
	bot.Handle("/ket", HandlePrompt2) // HandlePrompt2 now queues tasks
	bot.Handle("/status", utils.HandleStatusCommand)
	//bot.Handle(tele.OnText, HandleMessage)

	// Permission commands
	bot.Handle("/adduser", HandleAddUser)
	bot.Handle("/rmuser", HandleRemoveUser)
	bot.Handle("/addchat", HandleAddChat)
	bot.Handle("/rmchat", HandleRemoveChat)
	bot.Handle("/list", HandleList)

	// The main handler for processing text, must be last
	bot.Handle(tele.OnText, func(c tele.Context) error {
		// Ignore any text messages that are commands
		if strings.HasPrefix(c.Message().Text, "/") {
			return nil
		}

		// Log the received message for debugging
		// log.Printf("Received message in chat %d: %s", c.Chat().ID, c.Message().Text)

		// Reply to the message with the same text (echo)
		// _, err := c.Bot().Reply(c.Message(), "You said: "+c.Message().Text)
		return err
	})

	return bot
}

func Start(bot *tele.Bot) {
	if bot == nil {
		log.Println("Bot is nil, cannot start.")
		return
	}
	log.Println("Starting bot polling...")
	bot.Start()
	log.Println("Bot stopped polling.") // Should ideally not be reached if Start blocks
}

func Run() {
	// Initialize the bot
	bot := InitBot()

	log.Println("Application setup complete. Bot is initializing and starting...")
	go Start(bot) // Run the bot in a separate goroutine

	// Keep the main goroutine alive indefinitely, allowing background tasks (like the bot and worker) to run.
	select {}
}
