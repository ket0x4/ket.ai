import os
import psutil
import requests
from ketard.logger.logging import LOGGER


class SystemStatus:
    def __init__(self, version, lite, debug, api_url):
        self.version = version
        self.lite = lite
        self.debug = debug
        self.api_url = api_url

    # Universal API check
    def check_api(url, name):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                LOGGER(__name__).info(f"{name} API is reachable.")
                return True
            else:
                LOGGER(__name__).warning(f"{name} API is unreachable.")
                return False
        except requests.exceptions.RequestException as e:
            LOGGER(__name__).error(f"Error reaching {name} API: {str(e)}")

    def check_ollama_api(self):
        try:
            response = requests.get(self.api_url)
            if response.status_code == 200:
                LOGGER(__name__).info("Ollama API is reachable.")
                return True
            else:
                LOGGER(__name__).warning("Ollama API is unreachable.")
                return False
        except requests.exceptions.RequestException as e:
            LOGGER(__name__).error(f"Error reaching Ollama API: {str(e)}")
            return False

    # DuckDuckGo API check
    #duck_chat_url = "https://duckduckgo.com/duckchat/v1/status"
    #check_api(duck_chat_url, "DuckChat")

    def check_ddg_api(self):
        response = requests.get("https://duckduckgo.com/duckchat/v1/status")
        if response.status_code == 200:
            LOGGER(__name__).info("DuckChat API is reachable.")
            return True

    def check_hf_api(self):
        response = requests.get("http://huggingface.co")
        if response.status_code == 200:
            LOGGER(__name__).info("HuggingFace API is reachable.")
            return True

    def get_cpu_usage(self):
        return f"{psutil.cpu_percent(interval=1):.2f}%"

    def get_ram_usage(self):
        mem = psutil.virtual_memory()
        total_ram = mem.total / (1024**3)
        used_ram = mem.used / (1024**3)
        return f"{used_ram:.2f}/{total_ram:.2f}GB"

    def get_cpu_temperature(self):
        os_name = self.get_system_info()[1]
        if os_name == "Linux":
            try:
                with open("/sys/class/thermal/thermal_zone0/temp", "r") as temp_file:
                    temp = int(temp_file.read()) / 1000.0
                    LOGGER(__name__).info(f"CPU Temp: {temp:.2f}°C")
                    return f"{temp:.2f}°C"
            except FileNotFoundError:
                LOGGER(__name__).error("Failed to read CPU temperature.")
                return "Failed to read"
        return "Unsupported OS"

    def get_system_info(self):
        os_name = os.uname().sysname if os.name != "nt" else "Microsoft Windows"
        if os.path.exists("/sys/devices/virtual/dmi/id/product_name"):
            with open("/sys/devices/virtual/dmi/id/product_name") as f:
                board_name = f.read().strip()
        elif os.path.exists("/proc/device-tree/model"):
            with open("/proc/device-tree/model") as f:
                board_name = f.read().strip()
        else:
            board_name = "Unknown"

        return board_name, os_name

    def status_info_message(self):
        try:
            board_name, os_name = self.get_system_info()
            ollama_status = "OK" if self.check_ollama_api() else "Unavailable"
            ddg_status = "OK" if self.check_ddg_api() else "Unavailable"
            hf_status = "OK" if self.check_hf_api() else "Unavailable"
            return f"""
**System**
Board: `{board_name}`
OS: `{os_name}`
CPU Usage: `{self.get_cpu_usage()}`
RAM Usage: `{self.get_ram_usage()}`
CPU Temp: `{self.get_cpu_temperature()}\n`
**Backend**
DuckChat: `{ddg_status}`
HuggingFace: `{hf_status}`
Fallback: `{ollama_status}\n`
Version: `{self.version}`
Debug mode: `{self.debug}`
"""
        except Exception as e:
            LOGGER(__name__).error(f"Error fetching status info: {str(e)}")
