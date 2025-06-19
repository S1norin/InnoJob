from gradio_client import Client


def analyze_vacancy(text):
	prompt = f"""<s>[INST] You are a vacancy processing expert. Analyze the text delimited by triple backticks.
Perform BOTH tasks:
1. DETERMINE if it's a job vacancy (return boolean 'is_vacancy')
2. IF it's a vacancy, EXTRACT these chunks as JSON:
{{
  "job_title": "string",
  "company": "string",
  "location": "string",
  "description": "string",
  "responsibilities": ["list", "of", "strings"],
  "requirements": ["list", "of", "strings"],
  "benefits": ["list", "of", "strings"]
}}
IF NOT A VACANCY, return: {{"is_vacancy": false}}

Rules:
- Use null for missing data
- Output ONLY valid JSON (no other text)
- Handle varied formatting (typos, bullet points, etc.)

Text: ```{text}```[/INST]"""
	client = Client("hysts/mistral-7b")
	result = client.predict(
		message=prompt,
		param_2=1024,
		param_3=0.6,
		param_4=0.9,
		param_5=50,
		param_6=1.2,
		api_name="/chat"
	)
	return result


text = """

"""

if __name__ == '__main__':
	print(analyze_vacancy(text))