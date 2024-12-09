import sys
import json
from googletrans import Translator

def translate_text(text, target_language):
    translator = Translator()
    result = translator.translate(text, dest=target_language)
    return result.text

if __name__ == "__main__":
    # Ожидаем JSON строку в аргументах
    input_data = json.loads(sys.argv[1])
    target_language = input_data["language"]
    texts = input_data["texts"]

    translated_texts = [translate_text(text, target_language) for text in texts]
    print(json.dumps({"translated": translated_texts}))