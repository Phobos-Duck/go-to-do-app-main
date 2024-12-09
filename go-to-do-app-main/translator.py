import sys
import json
from transformers import MarianMTModel, MarianTokenizer
from concurrent.futures import ThreadPoolExecutor

class AdvancedTranslator:
    def __init__(self):
        self.models_cache = {}

    def load_model(self, source_language, target_language):
        model_name = f"Helsinki-NLP/opus-mt-{source_language}-{target_language}"
        if model_name not in self.models_cache:
            self.models_cache[model_name] = {
                "tokenizer": MarianTokenizer.from_pretrained(model_name),
                "model": MarianMTModel.from_pretrained(model_name)
            }
        return self.models_cache[model_name]

    def translate(self, text, source_language, target_language):
        try:
            model_data = self.load_model(source_language, target_language)
            tokenizer = model_data["tokenizer"]
            model = model_data["model"]

            inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
            translated = model.generate(**inputs)
            return tokenizer.decode(translated[0], skip_special_tokens=True)
        except Exception as e:
            return f"Error translating text: {e}"

    def batch_translate(self, texts, target_language, source_language):
        with ThreadPoolExecutor() as executor:
            results = executor.map(lambda text: self.translate(text, source_language, target_language), texts)
        return list(results)

if __name__ == "__main__":
    try:
        # Read input JSON string
        input_data = json.loads(sys.argv[1])
        target_language = input_data["targetLanguage"]
        source_language = input_data["sourceLanguage"]
        texts = input_data["texts"]

        translator = AdvancedTranslator()

        # Translate texts
        translated_texts = translator.batch_translate(texts, target_language, source_language)

        # Validate and output JSON
        print(json.dumps({"translated": translated_texts}))
    except Exception as e:
        # Handle unexpected top-level errors and output JSON error message
        print(json.dumps({"error": str(e)}))