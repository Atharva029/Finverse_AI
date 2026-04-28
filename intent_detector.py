class IntentDetector:
    def __init__(self):
        # Define keywords for each intent
        self.intent_keywords = {
            'spending_analysis': ['spend', 'spent', 'expense', 'where did my money go', 'transaction', 'category', 'budget'],
            'investment_advice': ['invest', 'stock', 'mutual fund', 'portfolio', 'crypto', 'shares', 'market'],
            'fraud_detection': ['fraud', 'suspicious', 'unusual', 'anomaly', 'scan', 'theft', 'unrecognized'],
            'savings_prediction': ['save', 'savings', 'emergency fund', 'budgeting tips', 'reduce expenses'],
            'expense_prediction': ['predict', 'forecast', 'next month', 'future spending', 'estimate spend'],
            'news_analysis': ['news', 'market trend', 'economy', 'gdp', 'rbi', 'fintech news']
        }

    def detect(self, query):
        """
        Detect the user intent based on keyword matching.
        """
        query_lower = query.lower()
        
        # Count matches for each intent
        intent_scores = {intent: 0 for intent in self.intent_keywords}
        
        for intent, keywords in self.intent_keywords.items():
            for kw in keywords:
                if kw in query_lower:
                    intent_scores[intent] += 1
        
        # Get the intent with the highest score
        best_intent = max(intent_scores, key=intent_scores.get)
        
        # If no keywords matched, default to spending_analysis as it's the most common
        if intent_scores[best_intent] == 0:
            return 'spending_analysis'
            
        return best_intent
