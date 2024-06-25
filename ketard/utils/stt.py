
import os

from speech_recognition import Recognizer, AudioFile

from ketard.logging import LOGGER


class SpeechRecognizer:
    def __init__(self):
        self.recognizer = Recognizer()

    async def convert_and_recognize(self, voice):
        wav = f"{voice}.wav"
        os.system(f"ffmpeg -i '{voice}' -vn '{wav}'")
        with AudioFile(wav) as source:
            audio = self.recognizer.record(source)
        try:
            return self.recognizer.recognize_google(
                audio, language="tr-TR"
            )
        except Exception as er:
            LOGGER(__name__).info(str(er))
