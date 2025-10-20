"""
RAG Evaluation Module for Contract Advisor System

This module provides comprehensive evaluation capabilities for RAG systems
using RAGAS framework and custom contract-specific metrics.
"""

import os
import json
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np

try:
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
        answer_similarity
    )
    from datasets import Dataset
    RAGAS_AVAILABLE = True
except ImportError:
    print("⚠️ RAGAS not available. Install with: pip install ragas datasets")
    RAGAS_AVAILABLE = False

from langchain.schema import Document
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from rag_pipeline import RAGPipeline


@dataclass
class EvaluationResult:
    """Container for evaluation results."""
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    context_recall: float = 0.0
    context_precision: float = 0.0
    answer_similarity: float = 0.0
    avg_response_time: float = 0.0
    total_questions: int = 0
    successful_queries: int = 0
    error_rate: float = 0.0
    custom_metrics: Dict[str, float] = None

    def __post_init__(self):
        if self.custom_metrics is None:
            self.custom_metrics = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'ragas_metrics': {
                'faithfulness': self.faithfulness,
                'answer_relevancy': self.answer_relevancy,
                'context_recall': self.context_recall,
                'context_precision': self.context_precision,
                'answer_similarity': self.answer_similarity
            },
            'performance_metrics': {
                'avg_response_time': self.avg_response_time,
                'total_questions': self.total_questions,
                'successful_queries': self.successful_queries,
                'error_rate': self.error_rate
            },
            'custom_metrics': self.custom_metrics,
            'overall_score': self.calculate_overall_score()
        }

    def calculate_overall_score(self) -> float:
        """Calculate overall RAG quality score."""
        if not RAGAS_AVAILABLE:
            return 0.0

        ragas_score = (
            self.faithfulness * 0.25 +
            self.answer_relevancy * 0.25 +
            self.context_recall * 0.25 +
            self.context_precision * 0.25
        )

        # Penalize high error rates
        error_penalty = max(0, 1 - self.error_rate)

        return ragas_score * error_penalty


class ContractQAEvaluator:
    """
    Comprehensive RAG evaluator for contract Q&A systems.

    Features:
    - RAGAS framework integration
    - Contract-specific metrics
    - Performance benchmarking
    - Error analysis
    """

    def __init__(self, vector_db_path: str = "../data/chroma_db"):
        self.vector_db_path = vector_db_path
        self.evaluation_history: List[EvaluationResult] = []

        # Contract-specific question templates
        self.contract_question_templates = [
            {
                "category": "payment_terms",
                "template": "What are the payment terms specified in the contract?",
                "expected_keywords": ["payment", "terms", "schedule", "due", "amount"]
            },
            {
                "category": "termination",
                "template": "Under what conditions can this contract be terminated?",
                "expected_keywords": ["terminate", "termination", "conditions", "breach"]
            },
            {
                "category": "liability",
                "template": "What are the liability provisions in this contract?",
                "expected_keywords": ["liability", "responsible", "damages", "limitation"]
            },
            {
                "category": "obligations",
                "template": "What are the main obligations of each party?",
                "expected_keywords": ["obligations", "responsibilities", "duties", "requirements"]
            }
        ]

    def create_test_dataset(self, document_path: str, num_questions: int = 10) -> Dict[str, List]:
        """Create test dataset for evaluation."""
        print(f"📊 Creating test dataset with {num_questions} questions...")

        # Generate contract-specific questions
        questions = []
        contexts = []
        ground_truths = []
        answers = []

        # Use template questions
        for i, template in enumerate(self.contract_question_templates):
            if len(questions) >= num_questions:
                break

            questions.append(template["template"])

            # For ground truth, we'll use a placeholder since we don't have human annotations
            # In practice, this should be created by legal experts
            ground_truths.append(f"Answer should contain information about {template['category']}")

        # Add some generic questions if needed
        generic_questions = [
            "What is the purpose of this contract?",
            "Who are the parties involved?",
            "What is the duration of this contract?",
            "What jurisdiction governs this contract?",
            "Are there any confidentiality clauses?"
        ]

        for i, question in enumerate(generic_questions):
            if len(questions) >= num_questions:
                break
            questions.append(question)
            ground_truths.append(f"Answer should address: {question}")

        return {
            "question": questions,
            "ground_truth": ground_truths
        }

    def evaluate_rag_pipeline(self,
                            document_path: str,
                            test_questions: Optional[List[str]] = None,
                            use_ragas: bool = True) -> EvaluationResult:
        """
        Evaluate RAG pipeline comprehensively.

        Args:
            document_path: Path to contract document
            test_questions: Optional list of test questions
            use_ragas: Whether to use RAGAS metrics

        Returns:
            EvaluationResult with comprehensive metrics
        """
        print("🔍 Starting comprehensive RAG evaluation...")

        # Initialize RAG pipeline
        try:
            rag_pipeline = RAGPipeline(document_path, self.vector_db_path)
            qa_chain = rag_pipeline.qa_chain()

            if not qa_chain:
                raise RuntimeError("Failed to create QA chain")

        except Exception as e:
            print(f"❌ Failed to initialize RAG pipeline: {e}")
            return EvaluationResult(error_rate=1.0)

        # Create test dataset
        if test_questions is None:
            test_data = self.create_test_dataset(document_path)
            test_questions = test_data["question"]
            ground_truths = test_data["ground_truth"]
        else:
            ground_truths = [""] * len(test_questions)  # Placeholder

        # Performance tracking
        response_times = []
        successful_queries = 0
        errors = []

        # Collect data for evaluation
        evaluation_data = {
            "question": [],
            "answer": [],
            "contexts": [],
            "ground_truth": []
        }

        print(f"📝 Evaluating {len(test_questions)} questions...")

        for i, question in enumerate(test_questions):
            try:
                start_time = time.time()

                # Query the RAG system
                result = qa_chain.invoke({
                    "question": question,
                    "chat_history": []
                })

                response_time = time.time() - start_time
                response_times.append(response_time)

                # Extract answer and contexts
                answer = result.get("answer", "")
                source_docs = result.get("source_documents", [])
                contexts = [doc.page_content for doc in source_docs]

                evaluation_data["question"].append(question)
                evaluation_data["answer"].append(answer)
                evaluation_data["contexts"].append(contexts)
                evaluation_data["ground_truth"].append(ground_truths[i])

                successful_queries += 1

                print(f"✓ Question {i+1}/{len(test_questions)}: {response_time:.2f}s")

            except Exception as e:
                error_msg = f"Question {i+1} failed: {str(e)}"
                errors.append(error_msg)
                print(f"❌ {error_msg}")

                # Add empty data to maintain alignment
                evaluation_data["question"].append(question)
                evaluation_data["answer"].append("")
                evaluation_data["contexts"].append([])
                evaluation_data["ground_truth"].append(ground_truths[i])

        # Create evaluation result
        result = EvaluationResult(
            avg_response_time=np.mean(response_times) if response_times else 0,
            total_questions=len(test_questions),
            successful_queries=successful_queries,
            error_rate=len(errors) / len(test_questions) if test_questions else 0
        )

        # Calculate RAGAS metrics if available
        if use_ragas and RAGAS_AVAILABLE and successful_queries > 0:
            try:
                # Create dataset for RAGAS
                dataset = Dataset.from_dict(evaluation_data)

                # Run RAGAS evaluation
                print("🧮 Running RAGAS evaluation...")
                ragas_result = evaluate(
                    dataset,
                    metrics=[
                        faithfulness,
                        answer_relevancy,
                        context_recall,
                        context_precision
                    ]
                )

                # Extract metrics
                if hasattr(ragas_result, 'to_pandas'):
                    df = ragas_result.to_pandas()
                    result.faithfulness = df['faithfulness'].mean()
                    result.answer_relevancy = df['answer_relevancy'].mean()
                    result.context_recall = df['context_recall'].mean()
                    result.context_precision = df['context_precision'].mean()

                print("✓ RAGAS evaluation completed")

            except Exception as e:
                print(f"⚠️ RAGAS evaluation failed: {e}")

        # Calculate custom contract-specific metrics
        result.custom_metrics = self._calculate_custom_metrics(evaluation_data)

        # Store result
        self.evaluation_history.append(result)

        return result

    def _calculate_custom_metrics(self, evaluation_data: Dict[str, List]) -> Dict[str, float]:
        """Calculate contract-specific evaluation metrics."""
        metrics = {}

        if not evaluation_data["answer"]:
            return metrics

        # 1. Answer completeness - checks if answers contain expected keywords
        completeness_scores = []
        for i, (answer, contexts) in enumerate(zip(evaluation_data["answer"], evaluation_data["contexts"])):
            if answer and contexts:
                # Simple heuristic: longer answers with more contexts tend to be more complete
                answer_length = len(answer.split())
                context_count = len(contexts)
                completeness = min(1.0, (answer_length / 50) * (context_count / 3))
                completeness_scores.append(completeness)

        if completeness_scores:
            metrics["answer_completeness"] = np.mean(completeness_scores)

        # 2. Context utilization - how well the system uses retrieved contexts
        utilization_scores = []
        for answer, contexts in zip(evaluation_data["answer"], evaluation_data["contexts"]):
            if answer and contexts:
                # Check if answer contains terms from contexts
                context_text = " ".join(contexts).lower()
                answer_text = answer.lower()

                # Simple Jaccard similarity
                context_words = set(context_text.split())
                answer_words = set(answer_text.split())

                if context_words:
                    utilization = len(context_words.intersection(answer_words)) / len(context_words)
                    utilization_scores.append(utilization)

        if utilization_scores:
            metrics["context_utilization"] = np.mean(utilization_scores)

        # 3. Legal terminology detection
        legal_terms = ["contract", "agreement", "party", "terminate", "liability", "obligation", "breach", "jurisdiction"]
        terminology_scores = []

        for answer in evaluation_data["answer"]:
            if answer:
                answer_lower = answer.lower()
                legal_count = sum(1 for term in legal_terms if term in answer_lower)
                terminology_scores.append(legal_count / len(legal_terms))

        if terminology_scores:
            metrics["legal_terminology_usage"] = np.mean(terminology_scores)

        return metrics

    def benchmark_performance(self, document_path: str, num_runs: int = 3) -> Dict[str, Any]:
        """Benchmark RAG pipeline performance over multiple runs."""
        print(f"🚀 Running performance benchmark ({num_runs} runs)...")

        results = []

        for run in range(num_runs):
            print(f"📊 Run {run + 1}/{num_runs}")
            result = self.evaluate_rag_pipeline(document_path, use_ragas=False)
            results.append(result)

            # Small delay between runs
            time.sleep(1)

        # Aggregate results
        avg_result = EvaluationResult()
        avg_result.avg_response_time = np.mean([r.avg_response_time for r in results])
        avg_result.error_rate = np.mean([r.error_rate for r in results])
        avg_result.total_questions = results[0].total_questions
        avg_result.successful_queries = np.mean([r.successful_queries for r in results])

        # Calculate custom metrics averages
        all_custom_metrics = {}
        for result in results:
            for metric, value in result.custom_metrics.items():
                if metric not in all_custom_metrics:
                    all_custom_metrics[metric] = []
                all_custom_metrics[metric].append(value)

        for metric, values in all_custom_metrics.items():
            avg_result.custom_metrics[metric] = np.mean(values)

        return {
            "benchmark_results": avg_result.to_dict(),
            "individual_runs": [r.to_dict() for r in results],
            "performance_stability": {
                "response_time_std": np.std([r.avg_response_time for r in results]),
                "error_rate_std": np.std([r.error_rate for r in results])
            }
        }

    def save_evaluation_report(self, result: EvaluationResult, output_path: str = "evaluation_report.json"):
        """Save evaluation results to JSON file."""
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "evaluation_results": result.to_dict(),
            "evaluation_history": [r.to_dict() for r in self.evaluation_history[-10:]]  # Last 10 evaluations
        }

        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"📄 Evaluation report saved to: {output_path}")

    def print_evaluation_summary(self, result: EvaluationResult):
        """Print a formatted evaluation summary."""
        print("\n" + "="*80)
        print("📊 RAG EVALUATION SUMMARY")
        print("="*80)

        print(f"📝 Performance Metrics:")
        print(f"   • Total Questions: {result.total_questions}")
        print(f"   • Successful Queries: {result.successful_queries}")
        print(f"   • Error Rate: {result.error_rate:.2%}")
        print(f"   • Avg Response Time: {result.avg_response_time:.2f}s")

        if RAGAS_AVAILABLE and any([result.faithfulness, result.answer_relevancy, result.context_recall, result.context_precision]):
            print(f"\n🧮 RAGAS Metrics:")
            print(f"   • Faithfulness: {result.faithfulness:.3f}")
            print(f"   • Answer Relevancy: {result.answer_relevancy:.3f}")
            print(f"   • Context Recall: {result.context_recall:.3f}")
            print(f"   • Context Precision: {result.context_precision:.3f}")

        if result.custom_metrics:
            print(f"\n🎯 Custom Metrics:")
            for metric, value in result.custom_metrics.items():
                print(f"   • {metric.replace('_', ' ').title()}: {value:.3f}")

        print(f"\n🏆 Overall Score: {result.calculate_overall_score():.3f}")
        print("="*80)


# Utility function for quick evaluation
def quick_evaluate(document_path: str, num_questions: int = 5) -> EvaluationResult:
    """Quick evaluation function for testing."""
    evaluator = ContractQAEvaluator()
    result = evaluator.evaluate_rag_pipeline(document_path, num_questions=num_questions)
    evaluator.print_evaluation_summary(result)
    return result


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) > 1:
        document_path = sys.argv[1]
        evaluator = ContractQAEvaluator()

        print("🔍 Starting Contract RAG Evaluation")
        result = evaluator.evaluate_rag_pipeline(document_path)
        evaluator.print_evaluation_summary(result)
        evaluator.save_evaluation_report(result)

    else:
        print("Usage: python evaluation.py <document_path>")
        print("Example: python evaluation.py ../data/uploads/sample_contract.pdf")