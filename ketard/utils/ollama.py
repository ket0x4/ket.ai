
import time

from ketard import ollama


async def ollama_invoke(prompt: str):
    start_time = time.time()
    response = await ollama.ainvoke(prompt)
    end_time = time.time()
    generation_time = round(end_time - start_time, 2)
    model_name = ollama.model
    info = f"\n\nTook: `{generation_time}s` | Model: `{model_name}`"
    return response, info
