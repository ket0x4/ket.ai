from youtube_transcript_api import YouTubeTranscriptApi

from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import permission_checker, system_status, paste, my_filters
from ketard.config import BotConfig
from ketard.logger.logging import LOGGER
from ketard.utils.helper import send_log
from ketard.utils.ollama import ollama_invoke
from ketard.utils.ddg import ddg_invoke


@Client.on_message(
    filters.command(["sum", "vid", "video", "youtube", "transcript", "summarize"])
    & my_filters.is_user_spamming()
)
@permission_checker
async def handle_ket_command(client: Client, message: Message):
    if len(message.command) != 1:
        url = message.command[1]
    elif message.reply_to_message:
        url = message.reply_to_message.text
    else:
        url = None

    if url is None:
        return await message.reply_text("Please enter a YouTube URL.")
    try:
        if not system_status.check_ddg_api():
            return await message.reply_text(
                "API not responding. Please try again later.", quote=True
            )

        msg = await message.reply_text(
            f"`{BotConfig.BOT_NAME}` Summarizing Video...",
            quote=True,
        )
        
        video_id = None
        if "watch?v=" in url:
            video_id = url[url.find("=") + 1 :]
            find_and = video_id.find("&")

            if find_and >= 0:
                video_id = video_id[:find_and]
        elif "/shorts/" in url or "/youtu.be/" in url:
            video_id = url[url.rfind("/") + 1 :]
            find_qs = video_id.find("?")

            if find_qs >= 0:
                video_id = video_id[:find_qs]
        else:
            return await msg.edit_text("Invalid URL format. Please provide a valid YouTube URL.")
        """
        if "youtube.com" in url:
            video_id = url.split("v=")[1]
        elif "youtu.be" in url:
            video_id = url.split("/")[-1]
        else:
            return await msg.edit_text(
                "Invalid URL format. Please provide a valid YouTube URL."
            )
        """
        # Temp fix for lang support
        languages = ["tr", "en"]
        transcript = None

        for lang in languages:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                break
            except Exception:
                continue

        if not transcript:
            for lang in languages:
                try:
                    transcript = YouTubeTranscriptApi.find_generated_transcript(video_id, [lang])
                    break
                except Exception as e:
                    continue

        if not transcript:
            return await msg.edit_text("Unable to process the video.")
        else:
            lmm_prompt = """This is a transcript of a YouTube video: summarize and make it short.
            I mean really short. Ignore sponsored sections and intro/outro.
            If its a tutorial, summarize the steps. If its a talk, summarize the key points.
            If its a music video, just write the lyrics. If its a movie, summarize the plot."""

            llm_prompt_tr = """Bu, bir YouTube videosunun transkriptidir: özetle ve kısa tut.
            Sakın uzatma. Sponsorlu bölümleri ve başlangıç/bitiş kısımlarını yok say
            Eğer bir eğitim videosuysa, adımları özetle. Bir konuşma ise, ana noktaları özetle.
            Eğer bir müzik videosuysa, sadece sözleri yaz. Bir film ise, hikayeyi özetle.
            Eğer trankript Türkçe değilse, önce çevir.
            """
            prompt = llm_prompt_tr + " ".join([item["text"] for item in transcript])

            response_header = f"**Summarized Video:** `{url}`\n\n"
            response, info = await ddg_invoke(prompt=prompt)
            formatted_response = response_header + response + info
            if len(formatted_response) > 4000:
                # if 31 > 1:
                p_link = await paste.paste(text=response)
                formatted_response = f"{response_header}The output is too long, [click to see]({p_link}){info}"
            await message.reply_text(
                text=formatted_response, quote=True, disable_web_page_preview=True
            )
            await msg.delete()
            LOGGER(__name__).info(
                f"Processed prompt from user {message.from_user.id} in chat {message.chat.id}."
            )
    except Exception as e:
        await send_log(client=client, error=e, message=message, name=__name__)
