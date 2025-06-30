package telegram

import (
	"ket/utils"

	tele "gopkg.in/telebot.v4"
)

// Command defines the structure for a bot command.
type Command struct {
	Name    string
	Handler tele.HandlerFunc
	Aliases []string
}

// commandGroups holds all the command groups for the bot.
var commandGroups = [][]Command{
	basicCommands,
	permissionCommands,
	ytCommands,
	ragCommands,
}

// RegisterCommands iterates through the command groups and registers them with the bot.
func RegisterCommands(bot *tele.Bot) {
	for _, group := range commandGroups {
		for _, cmd := range group {
			bot.Handle("/"+cmd.Name, cmd.Handler)
			for _, alias := range cmd.Aliases {
				bot.Handle("/"+alias, cmd.Handler)
			}
		}
	}
}

// Basic Commands
var basicCommands = []Command{
	{Name: "start", Handler: HandleStartCommand},
	{Name: "help", Handler: HandleHelp},
	{Name: "ket", Handler: HandlePrompt2},
	{Name: "status", Handler: utils.HandleStatusCommand},
}

// Permission Commands
var permissionCommands = []Command{
	{Name: "adduser", Handler: HandleAddUser},
	{Name: "rmuser", Handler: HandleRemoveUser},
	{Name: "addchat", Handler: HandleAddChat},
	{Name: "rmchat", Handler: HandleRemoveChat},
	{Name: "list", Handler: HandleList},
}

// YouTube Commands
var ytCommands = []Command{
	{Name: "yt", Handler: HandleYTCommand, Aliases: []string{"ytsum"}},
}

// RAG Commands
var ragCommands = []Command{
	{Name: "ragstats", Handler: HandleRAGStats, Aliases: []string{"rs"}},
	{Name: "raghistory", Handler: HandleRAGHistory, Aliases: []string{"rh"}},
	{Name: "ragclear", Handler: HandleRAGClear, Aliases: []string{"rc"}},
	{Name: "ragcontext", Handler: HandleRAGContext, Aliases: []string{"ra"}},
	{Name: "ragsummary", Handler: HandleRAGSummary, Aliases: []string{"rsm"}},
	{Name: "ragcleanup", Handler: HandleRAGCleanup},
}
