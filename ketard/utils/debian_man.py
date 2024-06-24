import sys
import subprocess
import requests

def get_man_page(item):

    url = "https://manpages.debian.org/jump?q={}".format(item)
    response = requests.get(url, allow_redirects=True)

    route = ""
    if response.status_code == 200:
        raw_man_page = response.text
        lines = raw_man_page.split('\n')
        for line in lines:
            if 'raw man page' in line:
                route = line.split("\"")[1]
                break
    else:
        return "Failed to retrieve the man page."

    response = requests.get("https://manpages.debian.org/{}".format(route), allow_redirects=True)
    process = subprocess.Popen(['man', '/dev/stdin'], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    output, error = process.communicate(input=response.text.encode("utf-8"))
    return output.decode('utf-8')
