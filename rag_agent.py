import requests
import json
import time
import os
import google.generativeai as genai
from dotenv import load_dotenv

from intent_detector import IntentDetector
from tools import FinancialTools
from context_builder import ContextBuilder

# Load environment variables
load_dotenv()

class FinverseRAGAgent:
    def __init__(self, db_config, model="gemma-3-27b-it"):
        self.model_name = model
        
        # Configure Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ WARNING: GEMINI_API_KEY not found in .env file. AI Copilot will not work.")
        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(self.model_name)

        
        self.intent_detector = IntentDetector()
        self.tools = FinancialTools(db_config)
        self.context_builder = ContextBuilder()
        
        # System Prompt from rag.txt
        self.system_prompt = """
        You are an AI Financial Copilot for the FINVERSE dashboard.
        Your tasks:
        - Analyse user spending
        - Detect financial mistakes
        - Suggest saving strategies
        - Use financial news to suggest safe financial awareness
        - You CAN and SHOULD summarize the provided financial news to explain current market sentiment if asked
        - You CAN provide general investment tips based on the current market sentiment and the user's savings
        - Never hallucinate data
        - Only use the provided context
        - If data is missing, say it clearly
        - Keep answers simple and practical
        - If the user wants to ADD or RECORD a transaction, extract details and return:
          CONFIRMATION: I have recorded a [type] of [amount] for [description] in the [category] category.

        The response MUST strictly follow this format for insights:
        Insight:
        Explanation:
        Risk Level:
        Recommendation:
        
        Use simple language (non-technical).
        Use bullet points where useful.
        """

    def detect_intent(self, query):
        """Identify the user's focus (spending, investment, etc.)"""
        return self.intent_detector.detect(query)

    def run_tools(self, user_id, intent):
        """Pre-compute insights based on detected intent."""
        spending_summary = self.tools.get_spending_summary(user_id)
        news_insights = self.tools.load_financial_news()
        credit_health = self.tools.calculate_credit_health(user_id)
        forecast_data = self.tools.load_forecast()
        
        # You could also fetch anomalies if the intent is fraud_detection
        return spending_summary, news_insights, credit_health, forecast_data

    def build_context(self, user_id, query, intent):
        """Combine internal data with tools into a text prompt."""
        spending, news, credit, forecast = self.run_tools(user_id, intent)
        return self.context_builder.build(spending, news, credit, forecast, query, intent)

    def generate_response(self, user_id, query):
        """Connect to Gemini API and return the final analysis."""
        intent = self.detect_intent(query)
        context = self.build_context(user_id, query, intent)
        
        full_prompt = f"{self.system_prompt}\n\nContext:\n{context}\n\nUser Question: {query}\n\nAI Response:"
        
        try:
            start_time = time.time()
            # Call Gemini
            response = self.client.generate_content(full_prompt)
            
            # Check if response has text (might be blocked by safety filters)
            if response.candidates and len(response.candidates) > 0:
                try:
                    ai_text = response.text
                    
                    # ─── AUTO-RECORD TRANSACTION ───
                    if intent == 'add_transaction' and 'CONFIRMATION:' in ai_text:
                        try:
                            # Use a specific prompt to extract clean JSON from the AI's own confirmation
                            extract_prompt = f"Extract transaction JSON from this text: '{ai_text}' and user query: '{query}'. Fields: amount (float), category (string), description (string), type (income/expense), date (YYYY-MM-DD). Return ONLY JSON."
                            extraction = self.client.generate_content(extract_prompt)
                            import re, json
                            match = re.search(r'\{.*\}', extraction.text, re.DOTALL)
                            if match:
                                data = json.loads(match.group())
                                self.tools.add_transaction(
                                    user_id=user_id,
                                    date=data.get('date', time.strftime('%Y-%m-%d')),
                                    description=data.get('description', 'AI Recorded'),
                                    category=data.get('category', 'other'),
                                    amount=data.get('amount', 0),
                                    txn_type=data.get('type', 'expense')
                                )
                        except Exception as e:
                            print(f"Extraction Error: {e}")
                except ValueError:
                    # If content was blocked, response.text will raise a ValueError
                    ai_text = "I'm sorry, I cannot answer that question as it was flagged by my safety filters. Please try rephrasing your request."
            else:
                ai_text = "I couldn't generate a response. Please try again with a different question."

            
            return {
                "success": True,
                "response": ai_text,
                "intent": intent,
                "response_time": f"{time.time() - start_time:.2f}s"
            }
        except Exception as e:
            print(f"❌ AI Copilot API Error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "message": f"AI Copilot encountered an error with the API. Please try again.",
                "error": str(e)
            }

