package utils

import (
	"fmt"
	"ket/permissions"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	tele "gopkg.in/telebot.v4"
)

// to-do: make it variable after implementing the config
const VERSION = "Next"

// to-do: make it dynamic after implementing llamacpp backend
var modelName = "Unknown"
var currentBackend = "llama.cpp"

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
		tempFile := "/sys/class/thermal/thermal_zone0/temp"
		data, err := os.ReadFile(tempFile)
		if err != nil {
			log.Printf("[Status] Error reading CPU Temp file %s: %v", tempFile, err)
			return "`I/O error`"
		}

		temp, err := strconv.Atoi(strings.TrimSpace(string(data)))
		if err != nil {
			log.Printf("[Status] Error parsing CPU Temp from file %s: %v", tempFile, err)
			return "`Invalid temp format`"
		}
		return fmt.Sprintf("%.2f°C", float64(temp)/1000.0)
	}
	return "Unsupported OS/Board"
}

func getBoardName() string {
	if runtime.GOOS == "linux" {
		// Try reading from DMI product name first
		boardFileDMI := "/sys/devices/virtual/dmi/id/product_name"
		if data, err := os.ReadFile(boardFileDMI); err == nil {
			name := strings.TrimSpace(string(data))
			if name != "" {
				return name
			}
		}

		// Fallback to device-tree model
		boardFileDeviceTree := "/proc/device-tree/model"
		if data, err := os.ReadFile(boardFileDeviceTree); err == nil {
			name := strings.TrimSpace(string(data))
			if name != "" {
				return name
			}
		}
	}
	return "Unknown"
}

func getSystemStats() string {
	cpuUsage := getCPUUsage()
	memoryUsage := getMemoryUsage()
	cpuTemp := getCPUTemperature()
	osName := runtime.GOOS
	if osName == "windows" {
		osName = "Microsoft Windows"
	}
	boardName := getBoardName()

	return fmt.Sprintf(`
<b>System Status</b>
<b>Version:</b> <code>%s</code>
<b>Board:</b> <code>%s</code>
<b>Platform:</b> <code>%s</code>
<b>CPU Usage:</b> <code>%.2f%%</code>
<b>Memory Usage:</b> <code>%.2f%%</code>
<b>CPU Temperature:</b> <code>%s</code>
<b>Backend:</b> <code>%s</code>
<b>LLM Model:</b> <code>%s</code>
`, VERSION, boardName, osName, cpuUsage, memoryUsage, cpuTemp, currentBackend, modelName)
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
