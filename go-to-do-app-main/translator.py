import sys
import json
from concurrent.futures import ThreadPoolExecutor
from transformers import MarianMTModel, MarianTokenizer
from requests.exceptions import HTTPError


class AdvancedTranslator:
    def __init__(self):
        self.models_cache = {}

    def load_model(self, source_language, target_language):
        """Загружает модель для перевода с указанного языка на целевой."""
        model_name = f"Helsinki-NLP/opus-mt-{source_language}-{target_language}"
        if model_name not in self.models_cache:
            try:
                self.models_cache[model_name] = {
                    "tokenizer": MarianTokenizer.from_pretrained(model_name),
                    "model": MarianMTModel.from_pretrained(model_name),
                }
            except HTTPError:
                raise ValueError(f"Model '{model_name}' not found. Please try translating via English first.")
            except Exception as e:
                raise ValueError(f"Error loading model '{model_name}': {e}")
        return self.models_cache[model_name]

    def translate(self, text, source_language, target_language):
        """Переводит текст с указанного языка на целевой."""
        try:
            model_data = self.load_model(source_language, target_language)
            tokenizer = model_data["tokenizer"]
            model = model_data["model"]

            inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
            translated = model.generate(**inputs)
            return tokenizer.decode(translated[0], skip_special_tokens=True)
        except ValueError as ve:
            # Попробуем перевод через английский, если модель недоступна
            if "Please try translating via English first" in str(ve):
                intermediate_text = self.translate(text, source_language, "en")
                return self.translate(intermediate_text, "en", target_language)
            return str(ve)
        except Exception as e:
            return f"Error translating text: {e}"

    def batch_translate(self, texts, source_language, target_language):
        """Обрабатывает перевод в батч-режиме."""
        if source_language == "ru" and target_language != "en":
            raise ValueError("Direct translation from 'ru' to non-'en' languages is not supported. Please translate to 'en' first.")
        with ThreadPoolExecutor() as executor:
            results = executor.map(lambda text: self.translate(text, source_language, target_language), texts)
        return list(results)


if __name__ == "__main__":
    try:
        # Получаем входные данные в формате JSON
        input_data = json.loads(sys.argv[1])
        target_language = input_data["targetLanguage"]
        source_language = input_data["sourceLanguage"]
        texts = input_data["texts"]

        # Инициализируем переводчик и выполняем перевод
        translator = AdvancedTranslator()
        translated_texts = translator.batch_translate(texts, source_language, target_language)

        # Возвращаем результат перевода
        print(json.dumps({"translated": translated_texts}))
    except ValueError as ve:
        # Специфическая ошибка, например, "перевод через английский"
        print(json.dumps({"error": str(ve)}))
    except Exception as e:
        # Обрабатываем общие ошибки
        print(json.dumps({"error": str(e)}))