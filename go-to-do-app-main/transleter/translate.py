import json
from transformers import pipeline


class SmartTranslator:
    def __init__(self):
        """
        Initialize the translator with support for multiple languages.
        """
        self.models = {
            "en": "Helsinki-NLP/opus-mt-en-ru",
            "ru": "Helsinki-NLP/opus-mt-ru-en",
            "de": "Helsinki-NLP/opus-mt-de-en",
            "kk": "Helsinki-NLP/opus-mt-kk-en"
        }
        self.pipelines = {lang: pipeline("translation", model=model) for lang, model in self.models.items()}

    def translate_text(self, text, source_language, target_language):
        """
        Translate a single piece of text.

        :param text: Text to translate.
        :param source_language: Source language code.
        :param target_language: Target language code.
        :return: Translated text.
        """
        try:
            if source_language == target_language:
                return text  # No translation needed

            model_key = f"{source_language}-{target_language}"
            if model_key in self.pipelines:
                translator = self.pipelines[model_key]
            else:
                # Fallback if specific direction is not available
                translator = self.pipelines[source_language]

            translated = translator(text, max_length=512)
            return translated[0]['translation_text']
        except Exception as e:
            return f"Error in translation: {str(e)}"

    def process_json(self, input_json, source_language, target_language):
        """
        Process and translate texts from a JSON input.

        :param input_json: JSON object containing text fields to translate.
        :param source_language: Source language code.
        :param target_language: Target language code.
        :return: JSON object with translated texts.
        """
        output_json = {}
        for key, value in input_json.items():
            if isinstance(value, str):
                output_json[key] = self.translate_text(value, source_language, target_language)

            elif isinstance(value, list):
                output_json[key] = [self.translate_text(item, source_language, target_language) if isinstance(item, str) else item for item in value]

            elif isinstance(value, dict):
                output_json[key] = self.process_json(value, source_language, target_language)

            else:
                output_json[key] = value

        return output_json