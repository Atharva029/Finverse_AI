class ContextBuilder:
    def build(self, user_spending, news_insights, credit_health, forecast_data, query, intent):
        """
        Convert all tool outputs into clean structured text context for the LLM.
        """
        # Spending Summary Section
        spending_summary = ""
        if "error" not in user_spending:
            overall = user_spending.get('overall_summary', {})
            breakdown = user_spending.get('monthly_breakdown', {})
            
            spending_summary = "AI Financial Analysis Context (Last 6 Months):\n"
            spending_summary += f"- Overall Total Spend: ₹{overall.get('total_spend', 0)}\n"
            spending_summary += f"- Overall Highest Spending Category: {overall.get('highest_spending_category', 'Unknown')}\n"
            spending_summary += f"- Overall Savings Forecast: ₹{overall.get('savings_estimate', 0)}\n\n"
            
            spending_summary += "Monthly Breakdown:\n"
            for month, data in breakdown.items():
                spending_summary += f"  * {month}: Spend ₹{data['total_spend']}, Income ₹{data['total_income']}, Top Category: {data['highest_category']}, Transactions: {data['transaction_count']}\n"
        
        # Credit Health Section
        credit_summary = ""
        if credit_health.get('success'):
            credit_summary = "Credit Health Context:\n"
            credit_summary += f"- Current Credit Score: {credit_health.get('score')} / 900\n"
            credit_summary += f"- Rating: {credit_health.get('rating')}\n"
            credit_summary += "- Key Factors:\n"
            for factor in credit_health.get('factors', []):
                credit_summary += f"  * {factor['title']}: {factor['value']} (Score: {factor['score']}/200)\n"
        
        # News Context Section
        news_summary = ""
        if news_insights:
            news_summary = "Financial News Context:\n"
            for news in news_insights[:3]:  # Top 3 relevant news
                news_summary += f"- {news['title']} (Sentiment: {news['sentiment']})\n"
                news_summary += f"  Summary: {news['summary']}\n"
        
        # Forecast Section
        forecast_summary = ""
        if forecast_data:
            summary = forecast_data.get('summary', {})
            forecast_summary = "Future Financial Forecast (Next Month):\n"
            forecast_summary += f"- Predicted Total Spending: ₹{summary.get('predicted_next_month', 0)}\n"
            forecast_summary += f"- Predicted Savings: ₹{summary.get('savings_forecast', 0)}\n"
            forecast_summary += f"- Change vs. Current Month: {summary.get('change_vs_current', 0)}%\n"
            
            cat_forecasts = forecast_data.get('category_level_forecast', [])
            if cat_forecasts:
                forecast_summary += "- Category-Specific Predictions:\n"
                for cat in cat_forecasts[:5]: # Top 5 categories
                    forecast_summary += f"  * {cat['category']}: ₹{cat['predicted_amount']} (Change: {cat['change_percentage']}%)\n"
        
        # Final Structured Context
        context = f"""
{spending_summary}

{credit_summary}
 
{forecast_summary}
 
{news_summary}

User Question: {query}
Detected Intent: {intent}
        """
        
        return context.strip()
