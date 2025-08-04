package utils

import (
	"fmt"
	"ket/backend"
	"ket/config"
	"log"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/sensors"
)

var (
	boardName     string
	boardNameOnce sync.Once
)

func getFormattedModelName() string {
	model := config.GetConfig().BackendSetup.Model
	model = strings.TrimPrefix(model, "model/")
	model = strings.TrimPrefix(model, "models/")
	return model
}

func getCPUUsage() (string, error) {
	percentages, err := cpu.Percent(time.Second, false)
	if err != nil {
		return "N/A", fmt.Errorf("error reading CPU usage: %w", err)
	}
	if len(percentages) == 0 {
		return "N/A", fmt.Errorf("no CPU usage data returned")
	}
	return fmt.Sprintf("%.2f%%", percentages[0]), nil
}

func getMemoryUsage() (string, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return "N/A", fmt.Errorf("error reading memory usage: %w", err)
	}
	return fmt.Sprintf("%.2f%%", v.UsedPercent), nil
}

func getCPUTemperature() string {
	temps, err := sensors.SensorsTemperatures()
	if err != nil {
		log.Printf("[Status] Error reading CPU temperature: %v", err)
		return "N/A"
	}

	if len(temps) == 0 {
		return "N/A"
	}

	return fmt.Sprintf("%.1f°C", temps[0].Temperature)
}

func getBoardName() string {
	boardNameOnce.Do(func() {
		if runtime.GOOS != "linux" {
			boardName = "Unsupported OS"
			return
		}
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
		boardName = "Unknown"
	})
	return boardName
}

func getUptime() (string, error) {
	uptime, err := host.Uptime()
	if err != nil {
		return "N/A", fmt.Errorf("error reading uptime: %w", err)
	}
	d := time.Duration(uptime) * time.Second
	return d.String(), nil
}

func GetSystemStats() string {
	cfg := config.GetConfig()

	var wg sync.WaitGroup
	var cpuUsage, memoryUsage, uptime, cpuTemp, osName, boardName, version, llmModel string
	var backendHealth string

	// Version
	version = "N/A"
	if cfg.Version != "" {
		version = cfg.Version
	}

	// LLM Model
	llmModel = "N/A"
	if cfg.BackendSetup.Model != "" {
		llmModel = getFormattedModelName()
	}

	// OS
	osName = runtime.GOOS
	if osName == "windows" {
		osName = "Windows"
	}

	wg.Add(4)

	go func() {
		defer wg.Done()
		var err error
		uptime, err = getUptime()
		if err != nil {
			log.Printf("[Status] %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		var err error
		cpuUsage, err = getCPUUsage()
		if err != nil {
			log.Printf("[Status] %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		var err error
		memoryUsage, err = getMemoryUsage()
		if err != nil {
			log.Printf("[Status] %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		cpuTemp = getCPUTemperature()
	}()

	wg.Wait()

	// Board Name
	boardName = getBoardName()

	backendHealth = "N/A"
	if backend.HealthCheck() {
		backendHealth = "✓ Healthy"
	} else {
		backendHealth = "✗ Down"
	}

	return fmt.Sprintf(`
<b>System Status</b>
- - - - - - - - - - - - - - - - -
<b>Version:</b> <code>%s</code>
<b>Board:</b> <code>%s</code>
<b>Platform:</b> <code>%s</code>
<b>Uptime:</b> <code>%s</code>
- - - - - - - - - - - - - - - - -
<b>CPU:</b> <code>%s</code>
<b>RAM:</b> <code>%s</code>
<b>CPU Temp:</b> <code>%s</code>
- - - - - - - - - - - - - - - - -
<b>LLM Model:</b> <code>%s</code>
<b>Backend:</b> <code>%s</code>
`, version, boardName, osName, uptime, cpuUsage, memoryUsage, cpuTemp, llmModel, backendHealth)
}
