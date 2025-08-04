package handlers

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/permissions"
	"ket/utils"
	"log"
	"strconv"
	"time"

	tele "gopkg.in/telebot.v4"
)

var (
	modelIDMap             = make(map[string]string)
	statusRefreshRateLimit = make(map[int64]time.Time)
	statusRefreshButton    = tele.InlineButton{
		Unique: "status_refresh",
		Text:   "⟳ Refresh",
	}
)

func HandleStartCommand(c tele.Context) error {
	log.Printf("[CMD] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	return c.Send(`Bot Running!`)
}

func HandleHelp(c tele.Context) error {
	log.Println("User:", c.Message().Chat.ID, "requested help")
	var helpMessage = `<b>Bot Commands</b>

	<b>▶ Basic Commands</b>
	• <code>/start</code> Get an introduction and available commands
	• <code>/help</code> Provides this help message
	• <code>/status</code> Check the current status of the host device
	• <code>/ket [prompt]</code> Send a prompt to the AI
	• <code>/model</code> List available LLM models

	<b>▶ YouTube Commands</b>
	• <code>/yt</code> or <code>/ytsum [URL]</code> Summarize a YouTube video
	
	<b>▶ User Management</b>
	• <code>/adduser [user_id]</code> Add a user to the allowed users list
	• <code>/rmuser [user_id]</code> Remove a user from the allowed users list
	• <code>/addchat [chat_id]</code> Add a chat to the allowed chats list
	• <code>/rmchat [chat_id]</code> Remove a chat from the allowed chats list
	• <code>/list</code> List all allowed users and chats
	
	<b>▶ Retrieval-Augmented Generation</b>
	RAG system enhances responses with relevant context
	The bot works better with context from previous conversations
	• <code>/reset</code> to clear the context and start fresh

	<b>▶ Auto-Response</b>
	Auto-response feature is enabled by default
	• <code>/autoreply</code> to manage auto-responses
	`

	return c.Send(helpMessage, &tele.SendOptions{ParseMode: tele.ModeHTML})
}

func HandleStatus(c tele.Context) error {
	log.Printf("[CMD] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	markup := &tele.ReplyMarkup{}
	markup.InlineKeyboard = [][]tele.InlineButton{{statusRefreshButton}}
	return c.Send(utils.GetSystemStats(), markup, tele.ModeHTML)
}

func HandleStatusRefresh(c tele.Context) error {
	userID := c.Sender().ID
	if !permissions.IsAdmin(userID) {
		return c.Respond(&tele.CallbackResponse{Text: "Only admins can refresh status.", ShowAlert: true})
	}
	last, ok := statusRefreshRateLimit[userID]
	if ok && time.Since(last) < 3*time.Second {
		return c.Respond(&tele.CallbackResponse{Text: "Rate limit: 1 refresh per 3 seconds.", ShowAlert: true})
	}
	statusRefreshRateLimit[userID] = time.Now()
	return c.Edit(utils.GetSystemStats(), &tele.ReplyMarkup{InlineKeyboard: [][]tele.InlineButton{{statusRefreshButton}}}, tele.ModeHTML)
}

func HandleModelCommand(c tele.Context) error {
	cfg := config.GetConfig()
	currentModel := cfg.BackendSetup.Model

	c.Send("Fetching models from backend...", tele.ModeHTML)
	models, err := backend.FetchModels(context.Background())
	if err != nil {
		return sendError(c, "Failed to fetch models", err)
	}

	modelIDMap = make(map[string]string)
	var rows [][]tele.InlineButton
	for i, m := range models {
		id := strconv.Itoa(i)
		modelIDMap[id] = m.ID
		btn := tele.InlineButton{
			Unique: "model_select",
			Text:   m.ID,
			Data:   id,
		}
		if m.ID == currentModel {
			btn.Text = "✓ " + m.ID
		}
		rows = append(rows, []tele.InlineButton{btn})
	}
	markup := &tele.ReplyMarkup{InlineKeyboard: rows}
	return c.Send("<b>Available Models:</b>", markup, tele.ModeHTML)
}

func HandleModelSelect(c tele.Context) error {
	data := c.Data()
	userID := c.Sender().ID
	if !permissions.IsAdmin(userID) {
		return c.Respond(&tele.CallbackResponse{Text: "Not authorized.", ShowAlert: true})
	}
	cfg := config.GetConfig()
	model, ok := modelIDMap[data]
	if !ok {
		return c.Respond(&tele.CallbackResponse{Text: "Invalid model selection.", ShowAlert: true})
	}
	models, err := backend.FetchModels(context.Background())
	if err != nil {
		return c.Respond(&tele.CallbackResponse{Text: "Failed to fetch models.", ShowAlert: true})
	}
	found := false
	for _, m := range models {
		if m.ID == model {
			found = true
			break
		}
	}
	if !found {
		return c.Respond(&tele.CallbackResponse{Text: "Model not found.", ShowAlert: true})
	}
	cfg.BackendSetup.Model = model
	config.UpdateConfig(cfg)
	err = config.SaveConfig()
	if err != nil {
		log.Printf("[FAIL] /model button | user:%d error saving config: %v", userID, err)
		return c.Respond(&tele.CallbackResponse{Text: "Failed to save config.", ShowAlert: true})
	}
	return c.Edit("<b>Model changed to:</b> <code>"+model+"</code>", &tele.SendOptions{ParseMode: tele.ModeHTML})
}

// sendError is a helper function to send a formatted error message to the user and log it.
func sendError(c tele.Context, message string, err error) error {
	log.Printf("[FAIL] user:%d chat:%d | Error: %v", c.Sender().ID, c.Chat().ID, err)

	// Using ModeHTML to allow for better formatting.
	errorMsg := fmt.Sprintf("%s\n\n<b>Error:</b>\n<code>%v</code>", message, err)

	return c.Reply(errorMsg, tele.ModeHTML)
}
