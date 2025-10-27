"""
Test Datasets for Contract RAG Evaluation

This module provides standardized test datasets for evaluating
contract Q&A systems with ground truth answers.
"""

import json
import os
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class TestCase:
    """Single test case for evaluation."""
    question: str
    ground_truth: str
    category: str
    difficulty: str  # "easy", "medium", "hard"
    expected_keywords: List[str]
    document_sections: List[str] = None  # Expected sections to find answer


class ContractTestDataset:
    """
    Standardized test datasets for contract evaluation.

    Categories:
    - Payment terms and schedules
    - Termination clauses
    - Liability and indemnification
    - Obligations and responsibilities
    - Confidentiality and privacy
    - Dispute resolution
    - Governing law and jurisdiction
    """

    def __init__(self):
        self.test_cases = self._generate_standard_test_cases()

    def _generate_standard_test_cases(self) -> List[TestCase]:
        """Generate comprehensive test cases for contract evaluation."""
        test_cases = [
            # Payment Terms
            TestCase(
                question="What are the payment terms specified in the contract?",
                ground_truth="The contract specifies payment terms including due dates, amounts, and payment methods.",
                category="payment_terms",
                difficulty="medium",
                expected_keywords=["payment", "terms", "due", "schedule", "amount", "invoice"]
            ),
            TestCase(
                question="When are payments due according to this agreement?",
                ground_truth="Payment due dates are specified in the contract with specific timeframes.",
                category="payment_terms",
                difficulty="easy",
                expected_keywords=["due", "date", "payment", "time", "within"]
            ),
            TestCase(
                question="What happens if payments are late?",
                ground_truth="The contract includes provisions for late payments, including penalties or interest.",
                category="payment_terms",
                difficulty="medium",
                expected_keywords=["late", "penalty", "interest", "breach", "consequences"]
            ),

            # Termination Clauses
            TestCase(
                question="Under what conditions can this contract be terminated?",
                ground_truth="The contract outlines specific conditions for termination by either party.",
                category="termination",
                difficulty="medium",
                expected_keywords=["terminate", "termination", "conditions", "breach", "notice"]
            ),
            TestCase(
                question="What is the termination notice period?",
                ground_truth="The contract requires advance written notice for termination.",
                category="termination",
                difficulty="easy",
                expected_keywords=["notice", "period", "days", "written", "advance"]
            ),
            TestCase(
                question="What are the consequences of early termination?",
                ground_truth="Early termination may result in penalties or specific obligations.",
                category="termination",
                difficulty="hard",
                expected_keywords=["early", "termination", "penalty", "consequences", "obligations"]
            ),

            # Liability and Indemnification
            TestCase(
                question="What are the liability provisions in this contract?",
                ground_truth="The contract defines liability limits and responsibilities of each party.",
                category="liability",
                difficulty="medium",
                expected_keywords=["liability", "responsible", "damages", "limitation", "cap"]
            ),
            TestCase(
                question="Is there a limitation of liability clause?",
                ground_truth="The contract includes provisions that limit liability under certain conditions.",
                category="liability",
                difficulty="hard",
                expected_keywords=["limitation", "liability", "cap", "exclude", "maximum"]
            ),
            TestCase(
                question="What types of damages are covered?",
                ground_truth="The contract specifies which types of damages are recoverable.",
                category="liability",
                difficulty="medium",
                expected_keywords=["damages", "consequential", "direct", "indirect", "covered"]
            ),

            # Obligations and Responsibilities
            TestCase(
                question="What are the main obligations of each party?",
                ground_truth="The contract outlines specific duties and responsibilities for each party.",
                category="obligations",
                difficulty="medium",
                expected_keywords=["obligations", "responsibilities", "duties", "requirements", "party"]
            ),
            TestCase(
                question="What are the deliverables under this agreement?",
                ground_truth="The contract specifies what goods or services will be delivered.",
                category="obligations",
                difficulty="easy",
                expected_keywords=["deliverables", "provide", "supply", "services", "goods"]
            ),
            TestCase(
                question="What are the quality standards or requirements?",
                ground_truth="The contract defines quality standards and acceptance criteria.",
                category="obligations",
                difficulty="medium",
                expected_keywords=["quality", "standards", "requirements", "acceptance", "criteria"]
            ),

            # Confidentiality and Privacy
            TestCase(
                question="Are there confidentiality provisions in this contract?",
                ground_truth="The contract includes clauses protecting confidential information.",
                category="confidentiality",
                difficulty="easy",
                expected_keywords=["confidential", "proprietary", "information", "disclosure", "secret"]
            ),
            TestCase(
                question="What information is considered confidential?",
                ground_truth="The contract defines what types of information are protected.",
                category="confidentiality",
                difficulty="medium",
                expected_keywords=["confidential", "information", "types", "includes", "protected"]
            ),
            TestCase(
                question="How long do confidentiality obligations last?",
                ground_truth="The contract specifies the duration of confidentiality requirements.",
                category="confidentiality",
                difficulty="hard",
                expected_keywords=["duration", "period", "years", "survive", "termination"]
            ),

            # Dispute Resolution
            TestCase(
                question="How are disputes resolved under this contract?",
                ground_truth="The contract specifies procedures for resolving disagreements.",
                category="dispute_resolution",
                difficulty="medium",
                expected_keywords=["dispute", "resolution", "mediation", "arbitration", "litigation"]
            ),
            TestCase(
                question="What jurisdiction applies to this contract?",
                ground_truth="The contract specifies the governing law and venue for disputes.",
                category="dispute_resolution",
                difficulty="easy",
                expected_keywords=["jurisdiction", "governing", "law", "venue", "court"]
            ),

            # General Contract Information
            TestCase(
                question="Who are the parties to this agreement?",
                ground_truth="The contract identifies all parties involved in the agreement.",
                category="general",
                difficulty="easy",
                expected_keywords=["parties", "agreement", "client", "provider", "names"]
            ),
            TestCase(
                question="What is the duration of this contract?",
                ground_truth="The contract specifies the start date and end date or duration.",
                category="general",
                difficulty="easy",
                expected_keywords=["duration", "period", "start", "end", "term"]
            ),
            TestCase(
                question="Can this contract be amended or modified?",
                ground_truth="The contract includes provisions for making changes or amendments.",
                category="general",
                difficulty="medium",
                expected_keywords=["amend", "modify", "change", "written", "agreement"]
            )
        ]

        return test_cases

    def get_test_cases_by_category(self, category: str) -> List[TestCase]:
        """Get test cases for a specific category."""
        return [tc for tc in self.test_cases if tc.category == category]

    def get_test_cases_by_difficulty(self, difficulty: str) -> List[TestCase]:
        """Get test cases by difficulty level."""
        return [tc for tc in self.test_cases if tc.difficulty == difficulty]

    def get_random_sample(self, num_questions: int) -> List[TestCase]:
        """Get a random sample of test cases."""
        import random
        return random.sample(self.test_cases, min(num_questions, len(self.test_cases)))

    def get_balanced_sample(self, num_questions: int) -> List[TestCase]:
        """Get a balanced sample across categories and difficulties."""
        categories = list(set(tc.category for tc in self.test_cases))
        difficulties = ["easy", "medium", "hard"]

        selected = []
        questions_per_category = num_questions // len(categories)

        for category in categories:
            category_cases = self.get_test_cases_by_category(category)
            # Balance across difficulties within each category
            for difficulty in difficulties:
                diff_cases = [tc for tc in category_cases if tc.difficulty == difficulty]
                if diff_cases and len(selected) < num_questions:
                    selected.append(diff_cases[0])

        # Fill remaining slots with any test cases
        while len(selected) < num_questions and len(selected) < len(self.test_cases):
            for tc in self.test_cases:
                if tc not in selected:
                    selected.append(tc)
                    break

        return selected[:num_questions]

    def to_ragas_format(self, test_cases: List[TestCase] = None) -> Dict[str, List]:
        """Convert test cases to RAGAS dataset format."""
        if test_cases is None:
            test_cases = self.test_cases

        return {
            "question": [tc.question for tc in test_cases],
            "ground_truth": [tc.ground_truth for tc in test_cases]
        }


class ContractEvaluator:
    """
    Enhanced evaluator with contract-specific test datasets.
    """

    def __init__(self):
        self.dataset = ContractTestDataset()

    def create_evaluation_report(self,
                              document_path: str,
                              num_questions: int = 10,
                              focus_categories: List[str] = None) -> Dict[str, Any]:
        """Create comprehensive evaluation report."""

        # Select test cases
        if focus_categories:
            test_cases = []
            for category in focus_categories:
                test_cases.extend(self.dataset.get_test_cases_by_category(category))
            test_cases = test_cases[:num_questions]
        else:
            test_cases = self.dataset.get_balanced_sample(num_questions)

        questions = [tc.question for tc in test_cases]
        ground_truths = [tc.ground_truth for tc in test_cases]
        categories = [tc.category for tc in test_cases]
        difficulties = [tc.difficulty for tc in test_cases]
        expected_keywords = [tc.expected_keywords for tc in test_cases]

        return {
            "questions": questions,
            "ground_truths": ground_truths,
            "categories": categories,
            "difficulties": difficulties,
            "expected_keywords": expected_keywords,
            "test_case_count": len(test_cases),
            "categories_covered": list(set(categories)),
            "difficulty_distribution": {
                "easy": len([d for d in difficulties if d == "easy"]),
                "medium": len([d for d in difficulties if d == "medium"]),
                "hard": len([d for d in difficulties if d == "hard"])
            }
        }

    def save_test_dataset(self, output_path: str = "test_dataset.json"):
        """Save test dataset to file."""
        dataset_data = {
            "test_cases": [
                {
                    "question": tc.question,
                    "ground_truth": tc.ground_truth,
                    "category": tc.category,
                    "difficulty": tc.difficulty,
                    "expected_keywords": tc.expected_keywords
                }
                for tc in self.dataset.test_cases
            ],
            "total_cases": len(self.dataset.test_cases),
            "categories": list(set(tc.category for tc in self.dataset.test_cases)),
            "metadata": {
                "created_for": "Contract RAG Evaluation",
                "version": "1.0"
            }
        }

        with open(output_path, 'w') as f:
            json.dump(dataset_data, f, indent=2)

        print(f"📄 Test dataset saved to: {output_path}")


if __name__ == "__main__":
    # Create and save test dataset
    evaluator = ContractEvaluator()
    evaluator.save_test_dataset()

    # Print dataset summary
    dataset = evaluator.dataset
    print(f"📊 Test Dataset Summary:")
    print(f"   • Total Test Cases: {len(dataset.test_cases)}")
    print(f"   • Categories: {len(set(tc.category for tc in dataset.test_cases))}")
    print(f"   • Difficulty Levels: {len(set(tc.difficulty for tc in dataset.test_cases))}")

    print(f"\n📋 Categories:")
    for category in sorted(set(tc.category for tc in dataset.test_cases)):
        count = len([tc for tc in dataset.test_cases if tc.category == category])
        print(f"   • {category}: {count} questions")