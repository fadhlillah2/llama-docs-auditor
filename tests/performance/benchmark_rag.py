"""
RAG Performance Benchmarking Script

This script provides comprehensive performance benchmarking for the RAG system
including response time, throughput, and quality metrics.
"""

import os
import sys
import time
import json
import statistics
import argparse
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
import threading
import psutil
import matplotlib.pyplot as plt

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from rag.evaluation.rag_evaluator import ContractQAEvaluator, EvaluationResult
    from rag.rag_pipeline import RAGPipeline
    EVALUATION_AVAILABLE = True
except ImportError as e:
    print(f"❌ Evaluation modules not available: {e}")
    EVALUATION_AVAILABLE = False


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark tests."""
    document_path: str
    num_questions: int = 20
    concurrent_users: int = 1
    warmup_queries: int = 3
    timeout_seconds: int = 300
    output_file: str = "benchmark_results.json"
    create_plots: bool = True


@dataclass
class PerformanceMetrics:
    """Performance metrics from benchmark."""
    response_times: List[float]
    success_rate: float
    error_rate: float
    throughput_qps: float  # Queries per second
    memory_usage_mb: float
    cpu_usage_percent: float
    total_time: float
    rag_scores: Dict[str, float] = None

    def __post_init__(self):
        if self.rag_scores is None:
            self.rag_scores = {}

    @property
    def avg_response_time(self) -> float:
        return statistics.mean(self.response_times) if self.response_times else 0

    @property
    def p95_response_time(self) -> float:
        return statistics.quantiles(self.response_times, n=20)[18] if len(self.response_times) > 20 else max(self.response_times) if self.response_times else 0

    @property
    def p99_response_time(self) -> float:
        return statistics.quantiles(self.response_times, n=100)[98] if len(self.response_times) > 100 else max(self.response_times) if self.response_times else 0


class RAGBenchmark:
    """
    Comprehensive RAG performance benchmarking tool.

    Features:
    - Response time analysis (mean, P95, P99)
    - Concurrency testing
    - Resource usage monitoring
    - Quality metrics integration
    - Visual performance reports
    """

    def __init__(self, config: BenchmarkConfig):
        self.config = config
        self.results = []
        self.monitoring_active = False

    def run_benchmark(self) -> Dict[str, Any]:
        """Run comprehensive benchmark suite."""
        print("🚀 Starting RAG Performance Benchmark")
        print(f"📄 Document: {self.config.document_path}")
        print(f"📊 Questions: {self.config.num_questions}")
        print(f"👥 Concurrent Users: {self.config.concurrent_users}")

        # Initialize RAG system
        print("\n🔧 Initializing RAG system...")
        self.rag_pipeline = RAGPipeline(self.config.document_path, "../data/chroma_db_benchmark")
        self.qa_chain = self.rag_pipeline.qa_chain()

        if not self.qa_chain:
            raise RuntimeError("Failed to initialize RAG pipeline")

        # Generate test questions
        test_questions = self._generate_test_questions()

        # Warmup queries
        print("🔥 Running warmup queries...")
        self._run_warmup(test_questions[:self.config.warmup_queries])

        # Start resource monitoring
        self._start_monitoring()

        # Run benchmark
        print(f"\n⚡ Running benchmark with {self.config.concurrent_users} concurrent users...")
        start_time = time.time()

        if self.config.concurrent_users == 1:
            metrics = self._run_sequential_benchmark(test_questions)
        else:
            metrics = self._run_concurrent_benchmark(test_questions)

        total_time = time.time() - start_time
        self._stop_monitoring()

        # Calculate throughput
        metrics.throughput_qps = len(test_questions) / total_time if total_time > 0 else 0

        # Run quality evaluation
        print("\n🧮 Running quality evaluation...")
        quality_metrics = self._run_quality_evaluation(test_questions[:5])  # Sample for quality
        metrics.rag_scores = quality_metrics

        # Store results
        self.results.append(metrics)

        # Generate report
        report = self._generate_report(metrics)
        self._save_results(report)

        if self.config.create_plots:
            self._create_plots(metrics)

        print(f"\n✅ Benchmark completed in {total_time:.2f}s")
        self._print_summary(metrics)

        return report

    def _generate_test_questions(self) -> List[str]:
        """Generate test questions for benchmarking."""
        base_questions = [
            "What are the payment terms in this contract?",
            "Under what conditions can this contract be terminated?",
            "What are the liability provisions?",
            "What are the main obligations of each party?",
            "What is the duration of this contract?",
            "Who are the parties to this agreement?",
            "What jurisdiction governs this contract?",
            "Are there confidentiality clauses?",
            "What happens in case of a dispute?",
            "Can this contract be amended?",
            "What are the deliverables?",
            "What quality standards apply?",
            "What are the insurance requirements?",
            "What constitutes a breach of contract?",
            "How are intellectual property rights handled?",
            "What are the force majeure provisions?",
            "What warranties are provided?",
            "How are taxes handled?",
            "What are the audit rights?",
            "What happens upon contract expiration?"
        ]

        # Return requested number of questions
        return base_questions[:self.config.num_questions]

    def _run_warmup(self, questions: List[str]):
        """Run warmup queries to initialize the system."""
        for question in questions:
            try:
                self.qa_chain.invoke({
                    "question": question,
                    "chat_history": []
                })
                time.sleep(0.1)  # Small delay between warmup queries
            except Exception as e:
                print(f"⚠️ Warmup query failed: {e}")

    def _run_sequential_benchmark(self, questions: List[str]) -> PerformanceMetrics:
        """Run benchmark with single user."""
        response_times = []
        errors = 0

        for i, question in enumerate(questions):
            try:
                start_time = time.time()
                result = self.qa_chain.invoke({
                    "question": question,
                    "chat_history": []
                })
                response_time = time.time() - start_time

                response_times.append(response_time)
                print(f"✓ Query {i+1}/{len(questions)}: {response_time:.3f}s")

            except Exception as e:
                errors += 1
                print(f"❌ Query {i+1} failed: {e}")

        return PerformanceMetrics(
            response_times=response_times,
            success_rate=(len(questions) - errors) / len(questions) if questions else 0,
            error_rate=errors / len(questions) if questions else 0,
            throughput_qps=0,  # Will be calculated later
            memory_usage_mb=self._get_memory_usage(),
            cpu_usage_percent=self._get_cpu_usage(),
            total_time=sum(response_times)
        )

    def _run_concurrent_benchmark(self, questions: List[str]) -> PerformanceMetrics:
        """Run benchmark with multiple concurrent users."""
        response_times = []
        errors = 0
        lock = threading.Lock()

        def run_user_query(question: str) -> float:
            """Run a single query as a user."""
            try:
                start_time = time.time()
                result = self.qa_chain.invoke({
                    "question": question,
                    "chat_history": []
                })
                response_time = time.time() - start_time

                with lock:
                    response_times.append(response_time)

                return response_time

            except Exception as e:
                with lock:
                    errors += 1
                print(f"❌ Concurrent query failed: {e}")
                return -1

        # Distribute questions among users
        questions_per_user = len(questions) // self.config.concurrent_users
        user_questions = []

        for i in range(self.config.concurrent_users):
            start_idx = i * questions_per_user
            end_idx = start_idx + questions_per_user if i < self.config.concurrent_users - 1 else len(questions)
            user_questions.append(questions[start_idx:end_idx])

        # Run queries concurrently
        with ThreadPoolExecutor(max_workers=self.config.concurrent_users) as executor:
            futures = []

            for user_idx, user_qs in enumerate(user_questions):
                for question in user_qs:
                    future = executor.submit(run_user_query, question)
                    futures.append(future)

            # Wait for all queries to complete
            for future in futures:
                try:
                    future.result(timeout=self.config.timeout_seconds)
                except Exception as e:
                    print(f"⚠️ Query timeout or error: {e}")
                    with lock:
                        errors += 1

        return PerformanceMetrics(
            response_times=response_times,
            success_rate=(len(questions) - errors) / len(questions) if questions else 0,
            error_rate=errors / len(questions) if questions else 0,
            throughput_qps=0,  # Will be calculated later
            memory_usage_mb=self._get_memory_usage(),
            cpu_usage_percent=self._get_cpu_usage(),
            total_time=max(response_times) if response_times else 0
        )

    def _run_quality_evaluation(self, questions: List[str]) -> Dict[str, float]:
        """Run quality evaluation on sample questions."""
        if not EVALUATION_AVAILABLE:
            return {}

        try:
            evaluator = ContractQAEvaluator(vector_db_path="../data/chroma_db_benchmark")
            result = evaluator.evaluate_rag_pipeline(
                self.config.document_path,
                test_questions=questions,
                use_ragas=False  # Skip RAGAS for faster benchmarking
            )

            return {
                "avg_response_time": result.avg_response_time,
                "success_rate": 1 - result.error_rate,
                "custom_metrics": result.custom_metrics
            }

        except Exception as e:
            print(f"⚠️ Quality evaluation failed: {e}")
            return {}

    def _start_monitoring(self):
        """Start resource monitoring."""
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitor_resources)
        self.monitor_thread.start()

    def _stop_monitoring(self):
        """Stop resource monitoring."""
        self.monitoring_active = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=5)

    def _monitor_resources(self):
        """Monitor system resources during benchmark."""
        self.memory_samples = []
        self.cpu_samples = []

        while self.monitoring_active:
            self.memory_samples.append(self._get_memory_usage())
            self.cpu_samples.append(self._get_cpu_usage())
            time.sleep(1)

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024

    def _get_cpu_usage(self) -> float:
        """Get current CPU usage percentage."""
        return psutil.cpu_percent(interval=1)

    def _generate_report(self, metrics: PerformanceMetrics) -> Dict[str, Any]:
        """Generate comprehensive benchmark report."""
        return {
            "benchmark_config": asdict(self.config),
            "performance_metrics": asdict(metrics),
            "summary": {
                "total_queries": self.config.num_questions,
                "concurrent_users": self.config.concurrent_users,
                "avg_response_time": metrics.avg_response_time,
                "p95_response_time": metrics.p95_response_time,
                "p99_response_time": metrics.p99_response_time,
                "throughput_qps": metrics.throughput_qps,
                "success_rate": metrics.success_rate,
                "error_rate": metrics.error_rate,
                "memory_usage_mb": metrics.memory_usage_mb,
                "cpu_usage_percent": metrics.cpu_usage_percent
            },
            "quality_metrics": metrics.rag_scores,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

    def _save_results(self, report: Dict[str, Any]):
        """Save benchmark results to file."""
        with open(self.config.output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"📄 Results saved to: {self.config.output_file}")

    def _create_plots(self, metrics: PerformanceMetrics):
        """Create performance visualization plots."""
        try:
            # Response time distribution
            plt.figure(figsize=(12, 8))

            # Plot 1: Response times
            plt.subplot(2, 2, 1)
            plt.plot(metrics.response_times)
            plt.title('Response Times Over Time')
            plt.xlabel('Query Number')
            plt.ylabel('Response Time (s)')
            plt.grid(True)

            # Plot 2: Response time histogram
            plt.subplot(2, 2, 2)
            plt.hist(metrics.response_times, bins=20, alpha=0.7)
            plt.title('Response Time Distribution')
            plt.xlabel('Response Time (s)')
            plt.ylabel('Frequency')
            plt.grid(True)

            # Plot 3: Performance summary
            plt.subplot(2, 2, 3)
            perf_data = {
                'Avg': metrics.avg_response_time,
                'P95': metrics.p95_response_time,
                'P99': metrics.p99_response_time
            }
            plt.bar(perf_data.keys(), perf_data.values())
            plt.title('Response Time Summary')
            plt.ylabel('Time (s)')
            plt.grid(True)

            # Plot 4: Success/Error rates
            plt.subplot(2, 2, 4)
            rates = [metrics.success_rate * 100, metrics.error_rate * 100]
            plt.pie(rates, labels=['Success', 'Error'], autopct='%1.1f%%')
            plt.title('Query Success Rate')

            plt.tight_layout()
            plot_file = self.config.output_file.replace('.json', '_plots.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"📊 Performance plots saved to: {plot_file}")

        except Exception as e:
            print(f"⚠️ Failed to create plots: {e}")

    def _print_summary(self, metrics: PerformanceMetrics):
        """Print benchmark summary."""
        print("\n" + "="*80)
        print("📊 BENCHMARK RESULTS SUMMARY")
        print("="*80)

        print(f"🚀 Performance:")
        print(f"   • Total Queries: {self.config.num_questions}")
        print(f"   • Concurrent Users: {self.config.concurrent_users}")
        print(f"   • Success Rate: {metrics.success_rate:.2%}")
        print(f"   • Error Rate: {metrics.error_rate:.2%}")
        print(f"   • Throughput: {metrics.throughput_qps:.2f} queries/second")

        print(f"\n⏱️  Response Times:")
        print(f"   • Average: {metrics.avg_response_time:.3f}s")
        print(f"   • P95: {metrics.p95_response_time:.3f}s")
        print(f"   • P99: {metrics.p99_response_time:.3f}s")
        print(f"   • Min: {min(metrics.response_times):.3f}s" if metrics.response_times else "   • Min: N/A")
        print(f"   • Max: {max(metrics.response_times):.3f}s" if metrics.response_times else "   • Max: N/A")

        print(f"\n💻 Resource Usage:")
        print(f"   • Memory: {metrics.memory_usage_mb:.1f} MB")
        print(f"   • CPU: {metrics.cpu_usage_percent:.1f}%")

        if metrics.rag_scores:
            print(f"\n🧮 Quality Metrics:")
            for metric, value in metrics.rag_scores.items():
                if isinstance(value, dict):
                    for sub_metric, sub_value in value.items():
                        print(f"   • {sub_metric}: {sub_value:.3f}")
                else:
                    print(f"   • {metric}: {value:.3f}")

        print("="*80)


def setup_logging():
    """Setup logging for benchmark."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"logs/performance/benchmark_{timestamp}.log"

    # Ensure logs directory exists
    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def main():
    """Main function to run benchmark."""
    logger = setup_logging()
    parser = argparse.ArgumentParser(description="RAG Performance Benchmark")
    parser.add_argument("document_path", help="Path to contract document")
    parser.add_argument("--questions", type=int, default=20, help="Number of test questions")
    parser.add_argument("--concurrent", type=int, default=1, help="Number of concurrent users")
    parser.add_argument("--warmup", type=int, default=3, help="Number of warmup queries")
    parser.add_argument("--timeout", type=int, default=300, help="Query timeout in seconds")
    parser.add_argument("--output", default="benchmark_results.json", help="Output file path")
    parser.add_argument("--no-plots", action="store_true", help="Disable plot generation")

    args = parser.parse_args()

    if not os.path.exists(args.document_path):
        print(f"❌ Document not found: {args.document_path}")
        return 1

    # Create benchmark configuration
    config = BenchmarkConfig(
        document_path=args.document_path,
        num_questions=args.questions,
        concurrent_users=args.concurrent,
        warmup_queries=args.warmup,
        timeout_seconds=args.timeout,
        output_file=args.output,
        create_plots=not args.no_plots
    )

    # Run benchmark
    try:
        benchmark = RAGBenchmark(config)
        report = benchmark.run_benchmark()
        return 0

    except Exception as e:
        print(f"❌ Benchmark failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())