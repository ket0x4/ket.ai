import requests
import json
import sys

def get_message(finput):
	headers = {
		    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
		    'Accept': 'text/event-stream',
		    'Accept-Language': 'en-US;q=0.7,en;q=0.3',
		    'Accept-Encoding': 'gzip, deflate, br',
		    'Referer': 'https://duckduckgo.com/',
		    'Content-Type': 'application/json',
		    'Origin': 'https://duckduckgo.com',
		    'Connection': 'keep-alive',
		    'Cookie': 'dcm=1',
		    'Sec-Fetch-Dest': 'empty',
		    'Sec-Fetch-Mode': 'cors',
		    'Sec-Fetch-Site': 'same-origin',
		    'Pragma': 'no-cache',
		    'TE': 'trailers',
		    'x-vqd-accept': '1',
		    'Cache-Control': 'no-store',
	}

	response = requests.get('https://duckduckgo.com/duckchat/v1/status', headers=headers)
	token = response.headers['x-vqd-4']

	headers['x-vqd-4'] = token

	url = 'https://duckduckgo.com/duckchat/v1/chat'

	data = {
		'model': 'gpt-3.5-turbo-0125',
		'messages': [
		    {
		        'role': 'user',
		        'content': finput
		    }
		]
	}

	response = requests.post(url, headers=headers, json=data)

	ret = ""
	for line in response.text.split("\n"):
		if len(line) > 0 and line[6] == '{':
		    dat = json.loads(line[6:])
		    if "message" in dat:
		        ret +=dat["message"].replace("\\n","\n")

	return ret.encode('latin1', errors='ignore').decode('utf8')
	
