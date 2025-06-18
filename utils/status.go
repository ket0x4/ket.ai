package utils

import (
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/permissions"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	tele "gopkg.in/telebot.v4"
)

var (
	boardName     string
	boardNameOnce sync.Once
)

func getCPUUsage() float64 {
	percentages, err := cpu.Percent(1, false)
	if err != nil {
		log.Printf("[Status] Error reading CPU usage: %v", err)
		return 0
	}
	return percentages[0]
}

func getMemoryUsage() float64 {
	v, err := mem.VirtualMemory()
	if err != nil {
		log.Printf("[Status] Error reading memory usage: %v", err)
		return 0
	}
	return v.UsedPercent
}

func getCPUTemperature() string {
	if runtime.GOOS == "linux" {
		if temp, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp"); err == nil {
			if tempInt, err := strconv.Atoi(strings.TrimSpace(string(temp))); err == nil {
				return fmt.Sprintf("%.1f°C", float64(tempInt)/1000.0)
			}
		}
	}
	return "Unsupported OS/Board"
}

func getBoardName() string {
	boardNameOnce.Do(func() {
		if runtime.GOOS == "linux" {
			// Try reading from DMI product name first
			if content, err := os.ReadFile("/sys/devices/virtual/dmi/id/product_name"); err == nil {
				boardName = strings.TrimSpace(string(content))
				return
			}

			// Fallback to device-tree model
			if content, err := os.ReadFile("/sys/firmware/devicetree/base/model"); err == nil {
				name := strings.TrimSpace(string(content))
				// remove null terminator
				if idx := strings.IndexByte(name, 0); idx != -1 {
					name = name[:idx]
				}
				boardName = name
				return
			}
		}
		boardName = "Unknown"
	})
	return boardName
}

func getSystemStats() string {
	cpuUsage := getCPUUsage()
	memoryUsage := getMemoryUsage()
	cpuTemp := getCPUTemperature()
	osName := runtime.GOOS
	if osName == "windows" {
		osName = "Windows"
	}
	boardName := getBoardName()
	cfg := config.GetConfig()

	return fmt.Sprintf(`
<b>System Status</b>
<b>Version:</b> <code>%s</code>
<b>Board:</b> <code>%s</code>
<b>Platform:</b> <code>%s</code>
<b>CPU Usage:</b> <code>%.2f%%</code>
<b>Memory Usage:</b> <code>%.2f%%</code>
<b>CPU Temp:</b> <code>%s</code>
<b>Backend:</b> <code>%s</code>
<b>LLM Model:</b> <code>%s</code>
`, cfg.VERSION, boardName, osName, cpuUsage, memoryUsage, cpuTemp, backend.Backend, cfg.MODEL)
}

func GetStatus() {
	stats := getSystemStats()
	log.Println(stats)
}

func HandleStatusCommand(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) { // IsAllowed is in the same package
		log.Printf("Unauthorized access attempt for /status by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}

	stats := getSystemStats()
	// Send the stats to the user
	log.Printf("User %d requested system status", c.Message().Chat.ID)
	return c.Reply(stats, tele.ModeHTML)
}
