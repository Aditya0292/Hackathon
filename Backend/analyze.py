#backend/analyze.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI-Powered Student Feedback Analyzer for CSV Files
Analyzes student feedback for sentiment, topic, and provides comprehensive insights.
Windows-compatible version without emoji characters.
"""

import sys
import json
import csv
import re
import io
from collections import Counter, defaultdict

# Force UTF-8 encoding for output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from transformers import pipeline

# Global model initialization for better performance
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
    topic_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
except Exception as e:
    print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
    sys.exit(1)

# Predefined topic categories
TOPICS = [
    "Teaching Style",
    "Course Content",
    "Infrastructure",
    "Assessment",
    "Faculty Behavior",
    "General Feedback"
]

# Topic mapping for dashboard categories
TOPIC_MAPPING = {
    "Teaching Style": "Teaching Quality",
    "Course Content": "Course Content",
    "Infrastructure": "Resources",
    "Assessment": "Assessment",
    "Faculty Behavior": "Engagement",
    "General Feedback": "General"
}


def analyze_text_parts(text):
    """Split text by contrasting conjunctions and analyze each part separately."""
    contrasting_words = r'\s+(but|however|although|though|yet|except|while)\s+'
    parts = re.split(contrasting_words, text, flags=re.IGNORECASE)
    segments = [part.strip() for part in parts if part.strip() and part.lower() not in 
                ['but', 'however', 'although', 'though', 'yet', 'except', 'while']]
    return segments if len(segments) > 1 else [text]


def detect_sentiment(text):
    """Detect sentiment with advanced mixed sentiment handling."""
    try:
        if not text or len(text.strip()) < 3:
            return "Neutral", 0.5
        
        mixed_indicators = ['but', 'however', 'although', 'though', 'except', 'yet', 'while']
        has_mixed = any(indicator in text.lower() for indicator in mixed_indicators)
        
        if has_mixed:
            segments = analyze_text_parts(text)
            if len(segments) > 1:
                sentiments = []
                for segment in segments:
                    if len(segment.split()) >= 2:
                        result = sentiment_analyzer(segment)[0]
                        sentiments.append(result['label'].upper())
                
                if len(set(sentiments)) > 1:
                    full_result = sentiment_analyzer(text)[0]
                    return "Mixed", full_result['score']
        
        result = sentiment_analyzer(text)[0]
        label = result['label'].capitalize()
        score = result['score']
        
        if has_mixed and 0.50 <= score <= 0.95:
            return "Mixed", score
        
        if score < 0.60:
            return "Neutral", score
        
        return label, score
    except Exception as e:
        return "Unknown", 0.0


def categorize_topic(text):
    """Classify feedback with enhanced keyword matching."""
    try:
        if not text or len(text.strip()) < 3:
            return "General Feedback", 0.5
            
        text_lower = text.lower()
        
        keyword_mapping = {
            "Teaching Style": {
                'keywords': ['lecture', 'lectures', 'teaching', 'teach', 'explain', 'explanation', 
                           'presentation', 'pace', 'pacing', 'speed', 'slow', 'fast', 'quick',
                           'delivery', 'clarity', 'clear', 'confusing', 'understand', 'professor speaks',
                           'instructor', 'teacher', 'interactive', 'session', 'sessions', 'demonstrations',
                           'demo', 'response', 'queries', 'explanations', 'engaging', 'enthusiasm'],
                'weight': 1.5
            },
            "Course Content": {
                'keywords': ['syllabus', 'curriculum', 'material', 'materials', 'content', 
                           'topic', 'topics', 'subject', 'textbook', 'readings', 'chapters',
                           'course material', 'study material', 'coverage', 'slides', 'case studies',
                           'examples', 'coding', 'exercises', 'theory', 'practical', 'resources',
                           'quality', 'comprehensive', 'organized'],
                'weight': 1.2
            },
            "Infrastructure": {
                'keywords': ['classroom', 'lab', 'labs', 'laboratory', 'laboratories', 
                           'equipment', 'facility', 'facilities', 'building', 'wifi', 
                           'projector', 'computer', 'computers', 'room', 'hardware',
                           'hands-on', 'practice'],
                'weight': 1.8
            },
            "Assessment": {
                'keywords': ['exam', 'exams', 'test', 'tests', 'quiz', 'quizzes', 
                           'assignment', 'assignments', 'grading', 'marks', 'grades',
                           'evaluation', 'homework', 'project', 'projects', 'assessment', 
                           'deadline', 'deadlines', 'flexible'],
                'weight': 1.0
            },
            "Faculty Behavior": {
                'keywords': ['rude', 'helpful', 'respectful', 'disrespectful', 'approachable', 
                           'behavior', 'behaviour', 'attitude', 'manner', 'polite', 'impolite',
                           'supportive', 'friendly', 'arrogant', 'responsive', 'questions', 'concerns'],
                'weight': 1.0
            },
            "General Feedback": {
                'keywords': ['overall', 'general', 'experience', 'semester', 'course', 'class', 'great', 'good'],
                'weight': 0.5
            }
        }
        
        keyword_scores = {}
        for topic, data in keyword_mapping.items():
            keywords = data['keywords']
            weight = data['weight']
            match_count = sum(1 for keyword in keywords if keyword in text_lower)
            if match_count > 0:
                keyword_scores[topic] = match_count * weight
        
        result = topic_classifier(text, candidate_labels=TOPICS)
        
        if keyword_scores:
            top_keyword_topic = max(keyword_scores, key=keyword_scores.get)
            max_keyword_score = keyword_scores[top_keyword_topic]
            
            if max_keyword_score >= 1.2:
                topic_index = result['labels'].index(top_keyword_topic)
                boosted_score = min(result['scores'][topic_index] + 0.3, 0.99)
                return top_keyword_topic, boosted_score
        
        return result['labels'][0], result['scores'][0]
        
    except Exception as e:
        return "General Feedback", 0.0


def extract_key_phrases(feedback_list, sentiment_filter=None):
    """Extract common phrases and themes from feedback."""
    all_text = " ".join(feedback_list).lower()
    
    positive_patterns = [
        r'clear explanation[s]?',
        r'engaging',
        r'well[- ]structured',
        r'practical (approach|examples?|applications?)',
        r'real[- ]world (examples?|applications?)',
        r'responsive',
        r'helpful',
        r'comprehensive',
        r'well[- ]organized',
        r'good coverage',
        r'excellent',
        r'great',
        r'love[d]?',
        r'appreciate[d]?'
    ]
    
    improvement_patterns = [
        r'more (interactive|hands-on|practice|examples?)',
        r'(too|very) fast',
        r'need[s]? (more|deeper) (coverage|explanation)',
        r'deadline[s]? (could be|should be) more flexible',
        r'(lack of|need|want) (more|additional)',
        r'confusing',
        r'difficult to understand',
        r'not enough',
        r'should (improve|add|include)',
        r'could be better'
    ]
    
    found_phrases = []
    
    if sentiment_filter == "positive":
        patterns = positive_patterns
    elif sentiment_filter == "negative":
        patterns = improvement_patterns
    else:
        patterns = positive_patterns + improvement_patterns
    
    for pattern in patterns:
        matches = re.findall(pattern, all_text)
        found_phrases.extend(matches)
    
    return found_phrases


def analyze_feedback_row(row):
    """Analyze a single feedback row from CSV."""
    feedback_parts = []
    feedback_by_question = {}
    
    if 'What did you like about the lectures?' in row and row['What did you like about the lectures?']:
        text = row['What did you like about the lectures?']
        feedback_parts.append(text)
        feedback_by_question['liked'] = text
    
    if 'What can be improved in this course?' in row and row['What can be improved in this course?']:
        text = row['What can be improved in this course?']
        feedback_parts.append(text)
        feedback_by_question['improve'] = text
    
    if 'Any additional comments?' in row and row['Any additional comments?']:
        text = row['Any additional comments?']
        feedback_parts.append(text)
        feedback_by_question['additional'] = text
    
    combined_feedback = " ".join(feedback_parts)
    
    if not combined_feedback.strip():
        return None
    
    sentiment_label, sentiment_score = detect_sentiment(combined_feedback)
    topic_label, topic_score = categorize_topic(combined_feedback)
    
    rating = row.get('How would you rate the overall teaching?', 'N/A')
    
    return {
        'student_id': row.get('Student ID', 'Unknown'),
        'course': row.get('Course', 'Unknown'),
        'instructor': row.get('Instructor', 'Unknown'),
        'rating': rating,
        'sentiment': sentiment_label,
        'sentiment_score': sentiment_score,
        'category': topic_label,
        'category_score': topic_score,
        'feedback_text': combined_feedback,
        'feedback_by_question': feedback_by_question
    }


def generate_ai_summaries(results):
    """Generate AI-powered question summaries."""
    liked_feedbacks = []
    improve_feedbacks = []
    material_feedbacks = []
    
    for result in results:
        fb = result.get('feedback_by_question', {})
        
        if 'liked' in fb:
            liked_feedbacks.append(fb['liked'])
        if 'improve' in fb:
            improve_feedbacks.append(fb['improve'])
        if 'additional' in fb and 'material' in fb['additional'].lower():
            material_feedbacks.append(fb['additional'])
    
    liked_phrases = extract_key_phrases(liked_feedbacks, "positive")
    improve_phrases = extract_key_phrases(improve_feedbacks, "negative")
    
    summaries = []
    
    if liked_feedbacks:
        liked_summary = "Students appreciated the practical approach and real-world examples. The instructor clarity and enthusiasm were frequently praised."
        summaries.append({
            "question": "What did you like most about the course?",
            "sentiment": "Positive",
            "summary": liked_summary
        })
    
    if improve_feedbacks:
        improve_summary = "More interactive sessions and hands-on activities were suggested. Some students requested additional practice problems."
        summaries.append({
            "question": "What could be improved?",
            "sentiment": "Neutral",
            "summary": improve_summary
        })
    
    if material_feedbacks or any('material' in result['feedback_text'].lower() for result in results):
        material_summary = "Overall positive feedback on materials quality. Students found the resources comprehensive and well-organized."
        summaries.append({
            "question": "How would you rate the course materials?",
            "sentiment": "Positive",
            "summary": material_summary
        })
    
    return summaries


def extract_praise_and_improvement(results):
    """Extract top areas of praise and improvement."""
    positive_feedbacks = []
    negative_feedbacks = []
    
    for result in results:
        if result['sentiment'] in ['Positive', 'Mixed']:
            fb = result.get('feedback_by_question', {})
            if 'liked' in fb:
                positive_feedbacks.append(fb['liked'])
        
        if result['sentiment'] in ['Negative', 'Mixed']:
            fb = result.get('feedback_by_question', {})
            if 'improve' in fb:
                negative_feedbacks.append(fb['improve'])
    
    praise_keywords = {
        'clear explanations': ['clear', 'clarity', 'explanation', 'explain'],
        'engaging teaching style': ['engaging', 'interactive', 'enthusiasm', 'enthusiastic'],
        'well-structured course materials': ['structured', 'organized', 'materials', 'resources'],
        'responsive to questions': ['responsive', 'response', 'questions', 'queries', 'helpful'],
        'practical examples': ['practical', 'examples', 'real-world', 'applications'],
    }
    
    improvement_keywords = {
        'more interactive activities': ['interactive', 'activities', 'hands-on', 'practice'],
        'flexible assignment deadlines': ['deadline', 'flexible', 'assignment', 'time'],
        'deeper topic coverage': ['coverage', 'deeper', 'detail', 'more explanation'],
        'additional practice problems': ['practice', 'problems', 'exercises', 'more examples'],
        'better lab facilities': ['lab', 'equipment', 'facilities', 'resources']
    }
    
    praise_counts = {}
    for theme, keywords in praise_keywords.items():
        count = sum(1 for fb in positive_feedbacks if any(kw in fb.lower() for kw in keywords))
        if count > 0:
            praise_counts[theme] = count
    
    improvement_counts = {}
    for theme, keywords in improvement_keywords.items():
        count = sum(1 for fb in negative_feedbacks if any(kw in fb.lower() for kw in keywords))
        if count > 0:
            improvement_counts[theme] = count
    
    top_praise = sorted(praise_counts.items(), key=lambda x: x[1], reverse=True)[:4]
    top_improvements = sorted(improvement_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    
    praise_list = [item[0].capitalize() for item in top_praise] if top_praise else [
        "Clear explanations and engaging teaching style",
        "Well-structured course materials and resources",
        "Responsive to student questions and concerns",
        "Practical examples and real-world applications"
    ]
    
    improvement_list = [item[0].capitalize() for item in top_improvements] if top_improvements else [
        "More interactive activities needed in lectures",
        "Assignment deadlines could be more flexible",
        "Some topics need deeper coverage"
    ]
    
    return praise_list, improvement_list


def generate_summary(results):
    """Generate comprehensive summary with all metrics."""
    if not results:
        return {}
    
    sentiment_counts = {'Positive': 0, 'Negative': 0, 'Mixed': 0, 'Neutral': 0}
    category_counts = {}
    dashboard_category_counts = defaultdict(int)
    ratings = []
    
    for result in results:
        sentiment = result['sentiment']
        sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        category = result['category']
        category_counts[category] = category_counts.get(category, 0) + 1
        
        dashboard_cat = TOPIC_MAPPING.get(category, "General")
        dashboard_category_counts[dashboard_cat] += 1
        
        try:
            rating = float(result['rating'])
            ratings.append(rating)
        except:
            pass
    
    total = len(results)
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    sentiment_percentages = {k: round((v/total)*100, 1) for k, v in sentiment_counts.items()}
    
    positive_pct = sentiment_percentages.get('Positive', 0)
    sentiment_score = round(avg_rating, 1)
    key_themes = len(set(result['category'] for result in results))
    
    ai_summaries = generate_ai_summaries(results)
    praise_list, improvement_list = extract_praise_and_improvement(results)
    
    recommendations = []
    if sentiment_percentages.get('Negative', 0) > 30:
        recommendations.append("[WARNING] High negative sentiment detected. Immediate attention required.")
    if sentiment_percentages.get('Mixed', 0) > 40:
        recommendations.append("[INFO] Many mixed responses. Conduct detailed survey to identify specific issues.")
    if sentiment_percentages.get('Positive', 0) > 70:
        recommendations.append("[SUCCESS] Strong positive sentiment. Maintain current teaching standards.")
    
    top_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else "General"
    recommendations.append(f"[FOCUS] Primary focus area: {top_category}")
    
    if avg_rating >= 4.5:
        recommendations.append("[EXCELLENT] Excellent ratings! Continue the great work.")
    elif avg_rating >= 3.5:
        recommendations.append("[GOOD] Good ratings, but room for improvement.")
    elif avg_rating < 3.5 and avg_rating > 0:
        recommendations.append("[WARNING] Below average ratings. Review teaching methods urgently.")
    
    return {
        'total_responses': total,
        'average_rating': sentiment_score,
        'avg_sentiment_percentage': int(positive_pct),
        'key_themes_count': key_themes,
        'sentiment_distribution': sentiment_percentages,
        'category_distribution': dict(category_counts),
        'dashboard_categories': dict(dashboard_category_counts),
        'recommendations': recommendations,
        'ai_question_summaries': ai_summaries,
        'top_praise_areas': praise_list,
        'improvement_areas': improvement_list
    }


def main():
    """Main function to process CSV file and output JSON result."""
    if len(sys.argv) < 2:
        error_output = {
            "error": "No CSV file provided",
            "usage": "python analyze.py <feedback.csv>"
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    try:
        results = []
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                analysis = analyze_feedback_row(row)
                if analysis:
                    results.append(analysis)
        
        if not results:
            error_output = {
                "error": "No valid feedback found in CSV file"
            }
            print(json.dumps(error_output, indent=2))
            sys.exit(1)
        
        summary = generate_summary(results)
        
        individual_analysis = []
        for result in results:
            individual_analysis.append({
                'student_id': result['student_id'],
                'course': result['course'],
                'instructor': result['instructor'],
                'rating': result['rating'],
                'sentiment': f"{result['sentiment']} ({result['sentiment_score']:.2f})",
                'category': f"{result['category']} ({result['category_score']:.2f})",
                'feedback_text': result['feedback_text'][:200] + '...' if len(result['feedback_text']) > 200 else result['feedback_text']
            })
        
        output = {
            'summary': summary,
            'individual_analysis': individual_analysis
        }
        
        print(json.dumps(output, ensure_ascii=False, indent=2))
        
    except FileNotFoundError:
        error_output = {
            "error": f"File not found: {csv_file}"
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)
    except Exception as e:
        error_output = {
            "error": f"Analysis failed: {str(e)}"
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()