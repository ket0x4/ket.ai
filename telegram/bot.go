package telegram

import (
	"ket/config"
	"ket/telegram/handlers"
	"time"

	tele "gopkg.in/telebot.v4"
)

type Bot struct {
	*tele.Bot
	cfg          *config.Config
	botStartTime time.Time
	promptQueue  chan *handlers.PromptTask
}

func NewBot(cfg *config.Config) (*Bot, error) {
	settings := tele.Settings{
		Token:     cfg.BotSetup.Token,
		Poller:    &tele.LongPoller{Timeout: 10 * time.Second},
		ParseMode: tele.ModeHTML,
	}

	b, err := tele.NewBot(settings)
	if err != nil {
		return nil, err
	}

	return &Bot{
		Bot:          b,
		cfg:          cfg,
		botStartTime: time.Now(),
		promptQueue:  make(chan *handlers.PromptTask, cfg.BotSetup.MaxQueue),
	}, nil
}

func (b *Bot) Start() {
	b.Bot.Start()
}