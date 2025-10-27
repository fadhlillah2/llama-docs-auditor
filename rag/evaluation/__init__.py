"""
RAG Evaluation Package for Contract Advisor

This package provides comprehensive evaluation capabilities for RAG systems
specialized in contract analysis and Q&A.
"""

from .rag_evaluator import (
    ContractQAEvaluator,
    EvaluationResult,
    quick_evaluate
)

from .test_datasets import (
    ContractTestDataset,
    ContractEvaluator,
    TestCase
)

__all__ = [
    # Main evaluator
    'ContractQAEvaluator',

    # Results and utilities
    'EvaluationResult',
    'quick_evaluate',

    # Test datasets
    'ContractTestDataset',
    'ContractEvaluator',
    'TestCase'
]

__version__ = "1.0.0"
__author__ = "Contract Advisor RAG Team"
__description__ = "RAG Evaluation Framework for Contract Analysis"