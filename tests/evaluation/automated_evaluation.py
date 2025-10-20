"""
Automated RAG Evaluation Pipeline

This script provides automated evaluation of RAG systems with scheduled runs,
result tracking, and performance trend analysis.
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from rag.evaluation.rag_evaluator import ContractQAEvaluator, EvaluationResult
    from rag.evaluation.test_datasets import ContractTestDataset
    EVALUATION_AVAILABLE = True
except ImportError as e:
    print(f"❌ Evaluation modules not available: {e}")
    EVALUATION_AVAILABLE = False

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/evaluation/evaluation_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class EvaluationConfig:
    """Configuration for automated evaluation."""
    document_path: str
    output_dir: str = "evaluation_results"
    num_questions: int = 15
    include_ragas: bool = True
    benchmark_runs: int = 3
    create_trends: bool = True
    notification_webhook: Optional[str] = None


class EvaluationHistory:
    """Manage evaluation history and trend analysis."""

    def __init__(self, history_file: str = "evaluation_history.json"):
        self.history_file = history_file
        self.history = self._load_history()

    def _load_history(self) -> List[Dict[str, Any]]:
        """Load evaluation history from file."""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load history: {e}")
                return []
        return []

    def add_evaluation(self, evaluation_result: Dict[str, Any]):
        """Add evaluation result to history."""
        evaluation_result["timestamp"] = datetime.now().isoformat()
        self.history.append(evaluation_result)
        self._save_history()

    def _save_history(self):
        """Save evaluation history to file."""
        try:
            with open(self.history_file, 'w') as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save history: {e}")

    def get_trend_analysis(self, days: int = 30) -> Dict[str, Any]:
        """Analyze trends in evaluation results."""
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_evaluations = [
            eval_data for eval_data in self.history
            if datetime.fromisoformat(eval_data["timestamp"]) > cutoff_date
        ]

        if len(recent_evaluations) < 2:
            return {"message": "Insufficient data for trend analysis"}

        # Extract metrics
        dates = []
        overall_scores = []
        response_times = []
        success_rates = []

        for eval_data in recent_evaluations:
            dates.append(datetime.fromisoformat(eval_data["timestamp"]))

            if "overall_score" in eval_data:
                overall_scores.append(eval_data["overall_score"])

            if "performance_metrics" in eval_data:
                perf = eval_data["performance_metrics"]
                response_times.append(perf.get("avg_response_time", 0))
                success_rates.append(1 - perf.get("error_rate", 0))

        trend_analysis = {
            "period_days": days,
            "num_evaluations": len(recent_evaluations),
            "date_range": {
                "start": dates[0].isoformat() if dates else None,
                "end": dates[-1].isoformat() if dates else None
            }
        }

        # Calculate trends
        if len(overall_scores) >= 2:
            score_trend = overall_scores[-1] - overall_scores[0]
            trend_analysis["overall_score_trend"] = {
                "change": score_trend,
                "percentage_change": (score_trend / overall_scores[0]) * 100 if overall_scores[0] > 0 else 0,
                "latest": overall_scores[-1],
                "average": sum(overall_scores) / len(overall_scores)
            }

        if len(response_times) >= 2:
            time_trend = response_times[-1] - response_times[0]
            trend_analysis["response_time_trend"] = {
                "change": time_trend,
                "percentage_change": (time_trend / response_times[0]) * 100 if response_times[0] > 0 else 0,
                "latest": response_times[-1],
                "average": sum(response_times) / len(response_times)
            }

        if len(success_rates) >= 2:
            success_trend = success_rates[-1] - success_rates[0]
            trend_analysis["success_rate_trend"] = {
                "change": success_trend,
                "percentage_change": (success_trend / success_rates[0]) * 100 if success_rates[0] > 0 else 0,
                "latest": success_rates[-1],
                "average": sum(success_rates) / len(success_rates)
            }

        return trend_analysis


class AutomatedEvaluationPipeline:
    """
    Automated pipeline for RAG evaluation with scheduling and monitoring.
    """

    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.history = EvaluationHistory()
        self.evaluator = ContractQAEvaluator()

        # Create output directory
        os.makedirs(self.config.output_dir, exist_ok=True)

    def run_evaluation(self) -> Dict[str, Any]:
        """Run a single evaluation cycle."""
        logger.info(f"🚀 Starting automated evaluation for {self.config.document_path}")

        # Create timestamped output file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(
            self.config.output_dir,
            f"evaluation_{timestamp}.json"
        )

        try:
            # Run main evaluation
            result = self.evaluator.evaluate_rag_pipeline(
                self.config.document_path,
                test_questions=None,  # Use default test questions from evaluator
                use_ragas=self.config.include_ragas
            )

            # Convert to dictionary
            evaluation_data = result.to_dict()

            # Add metadata
            evaluation_data["metadata"] = {
                "document_path": self.config.document_path,
                "config": asdict(self.config),
                "timestamp": datetime.now().isoformat(),
                "evaluation_type": "automated"
            }

            # Save results
            with open(output_file, 'w') as f:
                json.dump(evaluation_data, f, indent=2)

            # Add to history
            self.history.add_evaluation(evaluation_data)

            # Generate summary
            summary = self._generate_evaluation_summary(evaluation_data)

            logger.info(f"✅ Evaluation completed successfully")
            logger.info(f"📄 Results saved to: {output_file}")
            logger.info(f"🏆 Overall Score: {evaluation_data.get('overall_score', 'N/A')}")

            # Send notification if configured
            if self.config.notification_webhook:
                self._send_notification(summary, evaluation_data)

            return {
                "success": True,
                "output_file": output_file,
                "summary": summary,
                "evaluation_data": evaluation_data
            }

        except Exception as e:
            logger.error(f"❌ Evaluation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def run_benchmark_suite(self) -> Dict[str, Any]:
        """Run multiple evaluation iterations for benchmarking."""
        logger.info(f"🏁 Running benchmark suite with {self.config.benchmark_runs} iterations")

        benchmark_results = []

        for run in range(self.config.benchmark_runs):
            logger.info(f"📊 Benchmark run {run + 1}/{self.config.benchmark_runs}")

            result = self.run_evaluation()
            benchmark_results.append(result)

            # Small delay between runs
            if run < self.config.benchmark_runs - 1:
                time.sleep(5)

        # Analyze benchmark results
        successful_runs = [r for r in benchmark_results if r.get("success")]
        benchmark_summary = self._analyze_benchmark_results(successful_runs)

        # Save benchmark summary
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        benchmark_file = os.path.join(
            self.config.output_dir,
            f"benchmark_{timestamp}.json"
        )

        with open(benchmark_file, 'w') as f:
            json.dump(benchmark_summary, f, indent=2)

        logger.info(f"🏁 Benchmark suite completed")
        logger.info(f"📄 Benchmark summary saved to: {benchmark_file}")

        return benchmark_summary

    def _generate_evaluation_summary(self, evaluation_data: Dict[str, Any]) -> str:
        """Generate human-readable evaluation summary."""
        overall_score = evaluation_data.get('overall_score', 0)
        perf_metrics = evaluation_data.get('performance_metrics', {})
        ragas_metrics = evaluation_data.get('ragas_metrics', {})

        summary_lines = [
            "📊 RAG EVALUATION SUMMARY",
            "=" * 50,
            f"🏆 Overall Score: {overall_score:.3f}",
            "",
            "⚡ Performance Metrics:",
            f"   • Response Time: {perf_metrics.get('avg_response_time', 0):.2f}s",
            f"   • Success Rate: {(1 - perf_metrics.get('error_rate', 0)):.2%}",
            f"   • Total Questions: {perf_metrics.get('total_questions', 0)}",
        ]

        if ragas_metrics:
            summary_lines.extend([
                "",
                "🧮 RAGAS Metrics:",
                f"   • Faithfulness: {ragas_metrics.get('faithfulness', 0):.3f}",
                f"   • Answer Relevancy: {ragas_metrics.get('answer_relevancy', 0):.3f}",
                f"   • Context Recall: {ragas_metrics.get('context_recall', 0):.3f}",
                f"   • Context Precision: {ragas_metrics.get('context_precision', 0):.3f}",
            ])

        custom_metrics = evaluation_data.get('custom_metrics', {})
        if custom_metrics:
            summary_lines.extend([
                "",
                "🎯 Custom Metrics:",
            ])
            for metric, value in custom_metrics.items():
                summary_lines.append(f"   • {metric.replace('_', ' ').title()}: {value:.3f}")

        return "\n".join(summary_lines)

    def _analyze_benchmark_results(self, successful_runs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze results from multiple benchmark runs."""
        if not successful_runs:
            return {"error": "No successful benchmark runs"}

        # Extract metrics from all runs
        overall_scores = []
        response_times = []
        success_rates = []

        for run in successful_runs:
            eval_data = run.get("evaluation_data", {})
            overall_scores.append(eval_data.get('overall_score', 0))

            perf_metrics = eval_data.get('performance_metrics', {})
            response_times.append(perf_metrics.get('avg_response_time', 0))
            success_rates.append(1 - perf_metrics.get('error_rate', 1))

        # Calculate statistics
        import statistics

        benchmark_summary = {
            "benchmark_config": asdict(self.config),
            "num_runs": len(successful_runs),
            "timestamp": datetime.now().isoformat(),
            "statistics": {
                "overall_score": {
                    "mean": statistics.mean(overall_scores),
                    "median": statistics.median(overall_scores),
                    "min": min(overall_scores),
                    "max": max(overall_scores),
                    "std_dev": statistics.stdev(overall_scores) if len(overall_scores) > 1 else 0
                },
                "response_time": {
                    "mean": statistics.mean(response_times),
                    "median": statistics.median(response_times),
                    "min": min(response_times),
                    "max": max(response_times),
                    "std_dev": statistics.stdev(response_times) if len(response_times) > 1 else 0
                },
                "success_rate": {
                    "mean": statistics.mean(success_rates),
                    "median": statistics.median(success_rates),
                    "min": min(success_rates),
                    "max": max(success_rates),
                    "std_dev": statistics.stdev(success_rates) if len(success_rates) > 1 else 0
                }
            },
            "individual_runs": successful_runs
        }

        return benchmark_summary

    def generate_trend_report(self, days: int = 30) -> Dict[str, Any]:
        """Generate trend analysis report."""
        logger.info(f"📈 Generating trend report for last {days} days")

        trend_data = self.history.get_trend_analysis(days)

        if "message" in trend_data:
            return trend_data

        # Create trend report
        report = {
            "trend_analysis": trend_data,
            "recommendations": self._generate_recommendations(trend_data),
            "timestamp": datetime.now().isoformat()
        }

        # Save trend report
        trend_file = os.path.join(
            self.config.output_dir,
            f"trend_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        with open(trend_file, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"📈 Trend report saved to: {trend_file}")

        return report

    def _generate_recommendations(self, trend_data: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on trend analysis."""
        recommendations = []

        # Overall score recommendations
        if "overall_score_trend" in trend_data:
            score_trend = trend_data["overall_score_trend"]
            if score_trend["change"] < -0.05:  # 5% decrease
                recommendations.append(
                    "⚠️ Overall score decreasing significantly. Consider reviewing RAG pipeline components."
                )
            elif score_trend["change"] > 0.05:  # 5% increase
                recommendations.append(
                    "✅ Overall score improving. Current optimizations are effective."
                )

        # Response time recommendations
        if "response_time_trend" in trend_data:
            time_trend = trend_data["response_time_trend"]
            if time_trend["change"] > 1.0:  # 1 second increase
                recommendations.append(
                    "⚠️ Response times increasing. Consider performance optimizations."
                )
            elif time_trend["change"] < -0.5:  # 0.5 second decrease
                recommendations.append(
                    "✅ Response times improving. Caching and optimizations are working well."
                )

        # Success rate recommendations
        if "success_rate_trend" in trend_data:
            success_trend = trend_data["success_rate_trend"]
            if success_trend["change"] < -0.05:  # 5% decrease
                recommendations.append(
                    "⚠️ Success rate declining. Check for system stability issues."
                )

        if not recommendations:
            recommendations.append("✅ All metrics stable. Continue current configuration.")

        return recommendations

    def _send_notification(self, summary: str, evaluation_data: Dict[str, Any]):
        """Send notification about evaluation results."""
        try:
            import requests

            payload = {
                "text": summary,
                "overall_score": evaluation_data.get('overall_score', 0),
                "timestamp": datetime.now().isoformat()
            }

            response = requests.post(self.config.notification_webhook, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info("✅ Notification sent successfully")
            else:
                logger.warning(f"⚠️ Notification failed: {response.status_code}")

        except Exception as e:
            logger.error(f"❌ Failed to send notification: {e}")


def main():
    """Main function for automated evaluation."""
    parser = argparse.ArgumentParser(description="Automated RAG Evaluation Pipeline")
    parser.add_argument("document_path", help="Path to contract document")
    parser.add_argument("--output-dir", default="evaluation_results", help="Output directory")
    parser.add_argument("--questions", type=int, default=15, help="Number of test questions")
    parser.add_argument("--no-ragas", action="store_true", help="Disable RAGAS evaluation")
    parser.add_argument("--benchmark", type=int, default=0, help="Run benchmark with N iterations")
    parser.add_argument("--trends", type=int, default=0, help="Generate trend report for N days")
    parser.add_argument("--webhook", help="Notification webhook URL")

    args = parser.parse_args()

    if not os.path.exists(args.document_path):
        logger.error(f"❌ Document not found: {args.document_path}")
        return 1

    if not EVALUATION_AVAILABLE:
        logger.error("❌ Evaluation modules not available. Install with: pip install ragas datasets")
        return 1

    # Create configuration
    config = EvaluationConfig(
        document_path=args.document_path,
        output_dir=args.output_dir,
        num_questions=args.questions,
        include_ragas=not args.no_ragas,
        benchmark_runs=max(1, args.benchmark) if args.benchmark > 0 else 1,
        notification_webhook=args.webhook
    )

    # Create pipeline
    pipeline = AutomatedEvaluationPipeline(config)

    try:
        if args.benchmark > 0:
            # Run benchmark suite
            result = pipeline.run_benchmark_suite()
        else:
            # Run single evaluation
            result = pipeline.run_evaluation()

        if args.trends > 0:
            # Generate trend report
            trend_report = pipeline.generate_trend_report(args.trends)
            result["trend_report"] = trend_report

        return 0 if result.get("success") else 1

    except Exception as e:
        logger.error(f"❌ Pipeline execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())