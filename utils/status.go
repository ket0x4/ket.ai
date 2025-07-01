package utils

import (
	"fmt"
	"ket/config"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
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

func GetSystemStats() string {
	cpuUsage := getCPUUsage()
	memoryUsage := getMemoryUsage()
	cpuTemp := getCPUTemperature()
	osName := runtime.GOOS
	if osName == "windows" {
		osName = "Windows"
	}
	boardName := getBoardName()
	cfg := config.GetConfig()

	cpuUsageStr := "N/A"
	if cpuUsage > 0 {
		cpuUsageStr = fmt.Sprintf("%.2f%%", cpuUsage)
	}
	memoryUsageStr := "N/A"
	if memoryUsage > 0 {
		memoryUsageStr = fmt.Sprintf("%.2f%%", memoryUsage)
	}
	if cpuTemp == "" {
		cpuTemp = "N/A"
	}
	if boardName == "Unknown" || boardName == "" {
		boardName = "N/A"
	}
	llmModel := "N/A"
	if cfg.BackendSetup.Model != "" {
		llmModel = cfg.BackendSetup.Model
	}
	version := "N/A"
	if cfg.Version != "" {
		version = cfg.Version
	}

	return fmt.Sprintf(`
<b>System Status</b>
<b>Version:</b> <code>%s</code>
<b>Board:</b> <code>%s</code>
<b>Platform:</b> <code>%s</code>
<b>CPU Usage:</b> <code>%s</code>
<b>Memory Usage:</b> <code>%s</code>
<b>CPU Temp:</b> <code>%s</code>
<b>LLM Model:</b> <code>%s</code>
`, version, boardName, osName, cpuUsageStr, memoryUsageStr, cpuTemp, llmModel)
}
