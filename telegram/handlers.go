package telegram

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/permissions"
	"ket/random"
	"ket/utils"
	"log"
	"strconv"
	"strings"
	"time"

	tele "gopkg.in/telebot.v4"
)

var modelIDMap = make(map[string]string)
var statusRefreshRateLimit = make(map[int64]time.Time)
var statusRefreshButton = tele.InlineButton{
	Unique: "status_refresh",
	Text:   "⟳ Refresh",
}

// Helper: check admin and reply if not
func requireAdmin(c tele.Context, cmd string) bool {
	if !permissions.IsAdmin(c.Sender().ID) {
		log.Printf("[DENY] %s | user:%d chat:%d", cmd, c.Sender().ID, c.Chat().ID)
		c.Reply("You are not authorized to use this command.")
		return false
	}
	return true
}

// Helper: parse single int64 argument
func parseSingleIDArg(c tele.Context, usage string) (int64, bool) {
	args := strings.Split(c.Message().Text, " ")
	if len(args) < 2 {
		c.Reply(usage)
		return 0, false
	}
	id, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		c.Reply("Invalid ID.")
		return 0, false
	}
	return id, true
}

func HandleStartCommand(c tele.Context) error {
	log.Printf("[CMD] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("[DENY] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Printf("[ALLOW] /start | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	return c.Send(
		`Bot Running!`,
	)
}

func HandleAddUser(c tele.Context) error {
	log.Printf("[CMD] /adduser | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !requireAdmin(c, "/adduser") {
		return nil
	}
	userID, ok := parseSingleIDArg(c, "Usage: /adduser <user_id>")
	if !ok {
		return nil
	}
	err := permissions.AddUser(userID)
	if err != nil {
		log.Printf("[FAIL] /adduser | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error adding user: %v", err))
	}
	log.Printf("[OK] /adduser | user:%d chat:%d added user:%d", c.Sender().ID, c.Chat().ID, userID)
	return c.Reply(fmt.Sprintf("User %d added successfully.", userID))
}

func HandleRemoveUser(c tele.Context) error {
	log.Printf("[CMD] /rmuser | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !requireAdmin(c, "/rmuser") {
		return nil
	}
	userID, ok := parseSingleIDArg(c, "Usage: /rmuser <user_id>")
	if !ok {
		return nil
	}
	err := permissions.RemoveUser(userID)
	if err != nil {
		log.Printf("[FAIL] /rmuser | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error removing user: %v", err))
	}
	log.Printf("[OK] /rmuser | user:%d chat:%d removed user:%d", c.Sender().ID, c.Chat().ID, userID)
	return c.Reply(fmt.Sprintf("User %d removed successfully.", userID))
}

func HandleAddChat(c tele.Context) error {
	log.Printf("[CMD] /addchat | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !requireAdmin(c, "/addchat") {
		return nil
	}
	chatID, ok := parseSingleIDArg(c, "Usage: /addchat <chat_id>")
	if !ok {
		return nil
	}
	err := permissions.AddChat(chatID)
	if err != nil {
		log.Printf("[FAIL] /addchat | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error adding chat: %v", err))
	}
	log.Printf("[OK] /addchat | user:%d chat:%d added chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d added successfully.", chatID))
}

func HandleRemoveChat(c tele.Context) error {
	log.Printf("[CMD] /rmchat | user:%d chat:%d args:%q", c.Sender().ID, c.Chat().ID, c.Message().Text)
	if !requireAdmin(c, "/rmchat") {
		return nil
	}
	chatID, ok := parseSingleIDArg(c, "Usage: /rmchat <chat_id>")
	if !ok {
		return nil
	}
	err := permissions.RemoveChat(chatID)
	if err != nil {
		log.Printf("[FAIL] /rmchat | user:%d chat:%d error:%v", c.Sender().ID, c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Error removing chat: %v", err))
	}
	log.Printf("[OK] /rmchat | user:%d chat:%d removed chat:%d", c.Sender().ID, c.Chat().ID, chatID)
	return c.Reply(fmt.Sprintf("Chat %d removed successfully.", chatID))
}

func HandleStatus(c tele.Context) error {
	log.Printf("[CMD] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("[DENY] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Printf("[ALLOW] /status | user:%d chat:%d", c.Sender().ID, c.Chat().ID)

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

func HandleList(c tele.Context) error {
	log.Printf("[CMD] /list | user:%d chat:%d", c.Sender().ID, c.Chat().ID)
	if !requireAdmin(c, "/list") {
		return nil
	}
	users := permissions.ListUsers()
	chats := permissions.ListChats()
	var response strings.Builder
	response.WriteString("Allowed Users:\n")
	for _, user := range users {
		response.WriteString(fmt.Sprintf("- `%d`\n", user))
	}
	response.WriteString("\nAllowed Chats:\n")
	for _, chat := range chats {
		response.WriteString(fmt.Sprintf("- `%d`\n", chat))
	}
	log.Printf("[OK] /list | user:%d chat:%d listed users/chats", c.Sender().ID, c.Chat().ID)
	return c.Send(response.String(), &tele.SendOptions{ParseMode: tele.ModeMarkdown})
}

func HandleModelCommand(c tele.Context) error {
	cfg := config.GetConfig()
	currentModel := cfg.BackendSetup.Model
	isAdmin := permissions.IsAdmin(c.Sender().ID)

	if !isAdmin {
		return c.Reply("You are not authorized to change the model.")
	}

	c.Send("Fetching models from backend...", tele.ModeHTML)
	models, err := backend.FetchModels(context.Background())
	if err != nil {
		log.Printf("[FAIL] /model | user:%d error: %v", c.Sender().ID, err)
		return c.Reply("Failed to fetch models: " + err.Error())
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

func RegisterInlineHandlers(bot *tele.Bot) {
	bot.Handle(&tele.InlineButton{Unique: "model_select"}, HandleModelSelect)
}

func RegisterTextHandler(bot *tele.Bot) {
	bot.Handle(tele.OnText, HandleText)
}

func HandleText(c tele.Context) error {
	if strings.HasPrefix(c.Message().Text, "/") {
		return nil
	}

	if !permissions.IsAllowed(c.Chat().ID) {
		return nil
	}

	ok, err := random.LogMessage(c.Chat().ID, c.Sender().Username, c.Sender().ID, c.Message().Text)
	if err != nil {
		log.Printf("[AutoResponse] LogMessage error: %v", err)
	}
	if ok {
		log.Printf("[AutoResponse] Triggered for chat %d", c.Chat().ID)
		response, err := random.GenerateAutoResponse(context.Background(), c.Chat().ID)
		if err != nil {
			log.Printf("[AutoResponse] GenerateAutoResponse error: %v", err)
			return nil
		}
		_, sendErr := c.Bot().Reply(c.Message(), response)
		if sendErr != nil {
			log.Printf("[AutoResponse] Send error: %v", sendErr)
		}
	}
	return nil
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
