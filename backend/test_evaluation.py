"""
Test Suite for RAG Evaluation Framework

This module provides comprehensive testing for the RAG evaluation system
including unit tests, integration tests, and performance tests.
"""

import unittest
import tempfile
import os
import sys
import json
import time
from unittest.mock import patch, MagicMock, Mock
from typing import Dict, Any

# Add rag path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Try to import evaluation modules
try:
    from rag.evaluation.rag_evaluator import ContractQAEvaluator, EvaluationResult
    from rag.evaluation.test_datasets import ContractTestDataset, TestCase
    EVALUATION_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Evaluation modules not available: {e}")
    EVALUATION_AVAILABLE = False

try:
    from rag.rag_pipeline import RAGPipeline
    RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ RAG pipeline not available: {e}")
    RAG_AVAILABLE = False


class TestEvaluationResult(unittest.TestCase):
    """Test the EvaluationResult dataclass."""

    def setUp(self):
        if not EVALUATION_AVAILABLE:
            self.skipTest("Evaluation modules not available")

    def test_evaluation_result_initialization(self):
        """Test EvaluationResult can be initialized."""
        result = EvaluationResult()

        self.assertEqual(result.faithfulness, 0.0)
        self.assertEqual(result.answer_relevancy, 0.0)
        self.assertEqual(result.context_recall, 0.0)
        self.assertEqual(result.context_precision, 0.0)
        self.assertEqual(result.avg_response_time, 0.0)
        self.assertEqual(result.total_questions, 0)
        self.assertEqual(result.successful_queries, 0)
        self.assertEqual(result.error_rate, 0.0)
        self.assertEqual(result.custom_metrics, {})

    def test_evaluation_result_with_values(self):
        """Test EvaluationResult with provided values."""
        custom_metrics = {"test_metric": 0.85}
        result = EvaluationResult(
            faithfulness=0.9,
            answer_relevancy=0.8,
            context_recall=0.85,
            context_precision=0.88,
            avg_response_time=2.5,
            total_questions=10,
            successful_queries=9,
            error_rate=0.1,
            custom_metrics=custom_metrics
        )

        self.assertEqual(result.faithfulness, 0.9)
        self.assertEqual(result.answer_relevancy, 0.8)
        self.assertEqual(result.custom_metrics, custom_metrics)

    def test_overall_score_calculation(self):
        """Test overall score calculation."""
        # Test with good metrics
        result = EvaluationResult(
            faithfulness=0.9,
            answer_relevancy=0.8,
            context_recall=0.85,
            context_precision=0.88,
            error_rate=0.0
        )

        expected_score = (0.9 + 0.8 + 0.85 + 0.88) / 4  # Average of RAGAS metrics
        actual_score = result.calculate_overall_score()

        self.assertAlmostEqual(actual_score, expected_score, places=3)

    def test_overall_score_with_error_penalty(self):
        """Test overall score with error rate penalty."""
        result = EvaluationResult(
            faithfulness=0.9,
            answer_relevancy=0.8,
            context_recall=0.85,
            context_precision=0.88,
            error_rate=0.2  # 20% error rate
        )

        base_score = (0.9 + 0.8 + 0.85 + 0.88) / 4
        expected_score = base_score * 0.8  # 20% penalty

        self.assertAlmostEqual(result.calculate_overall_score(), expected_score, places=3)

    def test_to_dict_conversion(self):
        """Test conversion to dictionary."""
        result = EvaluationResult(
            faithfulness=0.9,
            custom_metrics={"test": 0.85}
        )

        result_dict = result.to_dict()

        self.assertIn('ragas_metrics', result_dict)
        self.assertIn('performance_metrics', result_dict)
        self.assertIn('custom_metrics', result_dict)
        self.assertIn('overall_score', result_dict)

        self.assertEqual(result_dict['ragas_metrics']['faithfulness'], 0.9)
        self.assertEqual(result_dict['custom_metrics']['test'], 0.85)


class TestContractTestDataset(unittest.TestCase):
    """Test the ContractTestDataset class."""

    def setUp(self):
        if not EVALUATION_AVAILABLE:
            self.skipTest("Evaluation modules not available")

    def test_dataset_initialization(self):
        """Test dataset can be initialized."""
        dataset = ContractTestDataset()

        self.assertIsInstance(dataset.test_cases, list)
        self.assertGreater(len(dataset.test_cases), 0)

    def test_test_case_structure(self):
        """Test test case has required fields."""
        dataset = ContractTestDataset()
        test_case = dataset.test_cases[0]

        self.assertIsInstance(test_case, TestCase)
        self.assertIsNotNone(test_case.question)
        self.assertIsNotNone(test_case.ground_truth)
        self.assertIsNotNone(test_case.category)
        self.assertIn(test_case.difficulty, ['easy', 'medium', 'hard'])
        self.assertIsInstance(test_case.expected_keywords, list)

    def test_get_test_cases_by_category(self):
        """Test filtering test cases by category."""
        dataset = ContractTestDataset()

        payment_cases = dataset.get_test_cases_by_category("payment_terms")

        self.assertGreater(len(payment_cases), 0)
        for case in payment_cases:
            self.assertEqual(case.category, "payment_terms")

    def test_get_test_cases_by_difficulty(self):
        """Test filtering test cases by difficulty."""
        dataset = ContractTestDataset()

        easy_cases = dataset.get_test_cases_by_difficulty("easy")

        self.assertGreater(len(easy_cases), 0)
        for case in easy_cases:
            self.assertEqual(case.difficulty, "easy")

    def test_get_balanced_sample(self):
        """Test getting balanced sample of test cases."""
        dataset = ContractTestDataset()

        sample = dataset.get_balanced_sample(5)

        self.assertEqual(len(sample), 5)

        # Check that we have different categories
        categories = set(case.category for case in sample)
        self.assertGreater(len(categories), 1)

    def test_to_ragas_format(self):
        """Test conversion to RAGAS format."""
        dataset = ContractTestDataset()

        ragas_data = dataset.to_ragas_format(dataset.test_cases[:3])

        self.assertIn('question', ragas_data)
        self.assertIn('ground_truth', ragas_data)
        self.assertEqual(len(ragas_data['question']), 3)
        self.assertEqual(len(ragas_data['ground_truth']), 3)


@unittest.skipUnless(RAG_AVAILABLE, "RAG pipeline not available")
class TestContractQAEvaluator(unittest.TestCase):
    """Test the ContractQAEvaluator class."""

    def setUp(self):
        if not EVALUATION_AVAILABLE:
            self.skipTest("Evaluation modules not available")

        # Create temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        self.temp_file.write("This is a test contract document. It contains payment terms and termination clauses.")
        self.temp_file.close()

        self.evaluator = ContractQAEvaluator(vector_db_path="/tmp/test_chroma")

    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_evaluator_initialization(self):
        """Test evaluator can be initialized."""
        self.assertIsInstance(self.evaluator, ContractQAEvaluator)
        self.assertEqual(self.evaluator.vector_db_path, "/tmp/test_chroma")
        self.assertIsInstance(self.evaluation.contract_question_templates, list)

    def test_create_test_dataset(self):
        """Test creating test dataset."""
        test_data = self.evaluator.create_test_dataset(self.temp_file.name, num_questions=5)

        self.assertIn('question', test_data)
        self.assertIn('ground_truth', test_data)
        self.assertEqual(len(test_data['question']), 5)
        self.assertEqual(len(test_data['ground_truth']), 5)

    @patch('rag.rag_pipeline.RAGPipeline')
    def test_evaluate_rag_pipeline_success(self, mock_rag_pipeline):
        """Test successful evaluation of RAG pipeline."""
        # Mock the RAG pipeline
        mock_pipeline_instance = Mock()
        mock_qa_chain = Mock()

        # Mock successful query response
        mock_qa_chain.invoke.return_value = {
            "answer": "This is a test answer about payment terms.",
            "source_documents": [Mock(page_content="Test context about payments")]
        }

        mock_pipeline_instance.qa_chain.return_value = mock_qa_chain
        mock_rag_pipeline.return_value = mock_pipeline_instance

        # Run evaluation
        result = self.evaluator.evaluate_rag_pipeline(
            self.temp_file.name,
            test_questions=["What are the payment terms?"],
            use_ragas=False  # Disable RAGAS for simpler testing
        )

        # Verify results
        self.assertIsInstance(result, EvaluationResult)
        self.assertEqual(result.total_questions, 1)
        self.assertEqual(result.successful_queries, 1)
        self.assertEqual(result.error_rate, 0.0)
        self.assertGreater(result.avg_response_time, 0)

    @patch('rag.rag_pipeline.RAGPipeline')
    def test_evaluate_rag_pipeline_with_errors(self, mock_rag_pipeline):
        """Test evaluation with RAG pipeline errors."""
        # Mock failed pipeline creation
        mock_rag_pipeline.return_value.qa_chain.return_value = None

        # Run evaluation
        result = self.evaluator.evaluate_rag_pipeline(
            self.temp_file.name,
            test_questions=["What are the payment terms?"],
            use_ragas=False
        )

        # Verify error handling
        self.assertEqual(result.error_rate, 1.0)
        self.assertEqual(result.total_questions, 0)

    def test_custom_metrics_calculation(self):
        """Test custom metrics calculation."""
        evaluation_data = {
            "answer": [
                "The contract specifies payment terms within 30 days.",
                "This agreement includes liability limitations."
            ],
            "contexts": [
                ["Payment shall be made within thirty days of invoice."],
                ["Neither party shall be liable for consequential damages."]
            ]
        }

        metrics = self.evaluator._calculate_custom_metrics(evaluation_data)

        self.assertIsInstance(metrics, dict)
        if metrics:  # Only check if metrics were calculated
            for metric, value in metrics.items():
                self.assertIsInstance(value, (int, float))
                self.assertGreaterEqual(value, 0)
                self.assertLessEqual(value, 1)


class TestPerformanceBenchmarking(unittest.TestCase):
    """Test performance benchmarking functionality."""

    def setUp(self):
        if not EVALUATION_AVAILABLE:
            self.skipTest("Evaluation modules not available")

        # Create temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        self.temp_file.write("Test contract document for performance testing.")
        self.temp_file.close()

        self.evaluator = ContractQAEvaluator(vector_db_path="/tmp/test_chroma")

    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    @patch('rag.rag_pipeline.RAGPipeline')
    def test_performance_benchmarking(self, mock_rag_pipeline):
        """Test performance benchmarking with mocked pipeline."""
        # Mock the RAG pipeline
        mock_pipeline_instance = Mock()
        mock_qa_chain = Mock()

        # Mock response with timing
        mock_qa_chain.invoke.return_value = {
            "answer": "Test answer",
            "source_documents": [Mock(page_content="Test context")]
        }

        mock_pipeline_instance.qa_chain.return_value = mock_qa_chain
        mock_rag_pipeline.return_value = mock_pipeline_instance

        # Run benchmark
        benchmark_result = self.evaluator.benchmark_performance(
            self.temp_file.name,
            num_runs=2
        )

        # Verify benchmark structure
        self.assertIn('benchmark_results', benchmark_result)
        self.assertIn('individual_runs', benchmark_result)
        self.assertIn('performance_stability', benchmark_result)

        # Verify we have results for each run
        self.assertEqual(len(benchmark_result['individual_runs']), 2)

    def test_evaluation_history_tracking(self):
        """Test that evaluation history is properly tracked."""
        # Create a mock result
        result = EvaluationResult(
            faithfulness=0.8,
            answer_relevancy=0.75,
            total_questions=5,
            successful_queries=5
        )

        # Add to history
        self.evaluator.evaluation_history.append(result)

        # Verify history tracking
        self.assertEqual(len(self.evaluator.evaluation_history), 1)
        self.assertEqual(self.evaluator.evaluation_history[0].faithfulness, 0.8)


class TestIntegrationWithRAG(unittest.TestCase):
    """Integration tests for evaluation with actual RAG components."""

    def setUp(self):
        if not EVALUATION_AVAILABLE or not RAG_AVAILABLE:
            self.skipTest("RAG or evaluation modules not available")

        # Create a more realistic test document
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        contract_content = """
        CONTRACT AGREEMENT

        This contract is entered into on January 1, 2024 between Party A and Party B.

        1. PAYMENT TERMS
        All payments shall be made within 30 days of invoice. The total contract value is $50,000.
        Late payments will incur a penalty of 5% per month.

        2. TERMINATION
        Either party may terminate this contract with 60 days written notice.
        Early termination may result in penalties as specified in Section 5.

        3. LIABILITY
        Neither party shall be liable for consequential damages exceeding $10,000.

        4. CONFIDENTIALITY
        All information shared between parties shall be kept confidential for 5 years.
        """
        self.temp_file.write(contract_content)
        self.temp_file.close()

    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

        # Clean up any created vector stores
        import shutil
        chroma_path = "/tmp/test_chroma"
        if os.path.exists(chroma_path):
            shutil.rmtree(chroma_path)

    @unittest.skip("Integration test - uncomment for manual testing")
    def test_end_to_end_evaluation(self):
        """End-to-end test of evaluation system."""
        # This test requires actual RAG pipeline - can be slow
        evaluator = ContractQAEvaluator(vector_db_path="/tmp/test_chroma")

        # Test questions based on our contract
        test_questions = [
            "What are the payment terms?",
            "When can the contract be terminated?",
            "What is the liability limitation?"
        ]

        start_time = time.time()
        result = evaluator.evaluate_rag_pipeline(
            self.temp_file.name,
            test_questions=test_questions,
            use_ragas=False  # Skip RAGAS for faster testing
        )
        total_time = time.time() - start_time

        # Verify results
        self.assertIsInstance(result, EvaluationResult)
        self.assertEqual(result.total_questions, 3)
        self.assertGreaterEqual(result.successful_queries, 0)
        self.assertLess(total_time, 120)  # Should complete within 2 minutes

        # Print results for manual inspection
        evaluator.print_evaluation_summary(result)


if __name__ == '__main__':
    # Create test suite
    test_suite = unittest.TestSuite()

    # Add test cases
    test_classes = [
        TestEvaluationResult,
        TestContractTestDataset,
        TestContractQAEvaluator,
        TestPerformanceBenchmarking,
        TestIntegrationWithRAG
    ]

    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)

    # Print summary
    if result.wasSuccessful():
        print("\n✅ All evaluation tests passed!")
    else:
        print(f"\n❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        sys.exit(1)