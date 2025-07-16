package telegram

import (
	"ket/permissions"
	"log"

	tele "gopkg.in/telebot.v4"
)

var helpMessage = `<b>Bot Commands</b>

<b>▶ Basic Commands</b>
<code>/start</code> Get an introduction and available commands
<code>/help</code> Provides this help message
<code>/status</code> Check the current status of the host device
<code>/ket [prompt]</code> Send a prompt to the AI
<code>/model</code> List available LLM models

<b>▶ YouTube Commands</b>
<code>/yt</code> or <code>/ytsum [URL]</code> Summarize a YouTube video

<b>▶ User Management</b>
<i>Note: Only admins can manage users and chats.</i>
<code>/adduser [user_id]</code> Add a user to the allowed users list
<code>/rmuser [user_id]</code> Remove a user from the allowed users list
<code>/addchat [chat_id]</code> Add a chat to the allowed chats list
<code>/rmchat [chat_id]</code> Remove a chat from the allowed chats list
<code>/list</code> List all allowed users and chats

<b>▶ Tips</b>
• RAG system remembers your conversations for better responses
• The bot works better with context from previous conversations`

func HandleHelp(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt for /help by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}
	log.Println("User:", c.Message().Chat.ID, "requested help")
	return c.Send(helpMessage, &tele.SendOptions{ParseMode: tele.ModeHTML})
}
