import os
import psutil
import requests
from ketard import LOGGER


class SystemStatus:
    def __init__(
        self,
        board,
        version,
        lite,
        debug,
        api_url
    ):
        self.board = board
        self.version = version
        self.lite = lite
        self.debug = debug
        self.api_url = api_url

    def get_cpu_usage(self):
        """Get current CPU usage percentage."""
        cpu_pct = (
            os.popen(
                """grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage }' """
            )
            .readline()
            .strip()
        )
        return f"**CPU Usage:** `{cpu_pct}%`"

    def get_ram_usage(self):
        """Get RAM usage information."""
        mem = psutil.virtual_memory()
        total_ram = mem.total / (1024**3)  # Convert to GB
        used_ram = mem.used / (1024**3)
        return f"**RAM Usage:** `{used_ram:.2f}/{total_ram:.2f}GB`"

    def get_cpu_temperature(self):
        """Get CPU temperature."""
        try:
            with open(
                "/sys/class/thermal/thermal_zone0/temp",
                "r"
            ) as temp_file: # only works on Raspberry Pi
                temp = int(temp_file.read()) / 1000.0
                LOGGER(__name__).info(
                    f"CPU temperature: {temp:.2f}°C"
                )
                return f"**CPU Temp:** `{temp:.2f}°C`"
        except FileNotFoundError:
            LOGGER(__name__).error(
                "Failed to read CPU temperature."
            )
            return "**CPU Temp:** `Failed to read`"

    def check_ollama_api(self):
        """Check the status of Ollama API."""
        try:
            response = requests.get(self.api_url)
            if response.status_code == 200:
                LOGGER(__name__).info(
                    "Ollama API is reachable."
                )
                return "**Ollama API:** `Available`"
            else:
                LOGGER(__name__).warning(
                    "Ollama API is unreachable."
                )
                return False
        except requests.exceptions.RequestException as e:
            LOGGER(__name__).error(
                f"Error reaching Ollama API: {str(e)}"
            )
            return "**Ollama API:** `Unavailable`"

    def send_status_info_message(self):
        try:
            device = f"**Board:** `{self.board}`"
            cpu_usage = self.get_cpu_usage()
            ram_usage = self.get_ram_usage()
            cpu_temp = self.get_cpu_temperature()
            ollama_api = self.check_ollama_api()
            version = f"**Version:** `{self.version}`"
            lite = f"**Lite mode:** `{self.lite}`"
            debug = f"**Debug mode:** `{self.debug}`"
            
            return f"{device}\n{cpu_usage}\n{ram_usage}\n{ollama_api}\n{cpu_temp}\n{lite}\n{debug}\n{version}"

        except Exception as e:
            LOGGER(__name__).error(
                f"Error fetching status info: {str(e)}"
            )
