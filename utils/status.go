package utils

import (
	"fmt"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
)

const VERSION = "1.0.0"

var modelName = "Llama"

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
		if data, err := os.ReadFile(tempFile); err == nil {
			temp, err := strconv.Atoi(strings.TrimSpace(string(data)))
			if err == nil {
				return fmt.Sprintf("%.2f°C", float64(temp)/1000.0)
			}
		} else {
			log.Printf("[Status] Error reading CPU Temp: %v", err)
			return "`I/O error`"
		}
	}
	return "Unsupported OS/Board"
}

func getBoardName() string {
	if runtime.GOOS == "linux" {
		boardFile := "/sys/devices/virtual/dmi/id/product_name"
		if _, err := os.Stat(boardFile); err == nil {
			if data, err := os.ReadFile(boardFile); err == nil {
				return strings.TrimSpace(string(data))
			}
		}
		boardFile = "/proc/device-tree/model"
		if _, err := os.Stat(boardFile); err == nil {
			if data, err := os.ReadFile(boardFile); err == nil {
				return strings.TrimSpace(string(data))
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
**System Status**
Version: "%s"
Board: "%s"
OS: "%s"
CPU Usage: "%.2f%%"
Memory Usage: "%.2f%%"
CPU Temperature: "%s"
Backend: "Llama.cpp"
LLM Model: "%s"
`, VERSION, boardName, osName, cpuUsage, memoryUsage, cpuTemp, modelName)
}

func GetStatus() {
	stats := getSystemStats()
	fmt.Println(stats)
}
