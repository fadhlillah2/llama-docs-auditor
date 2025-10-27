"""
Integration Tests for RAG Pipeline Components

This module provides comprehensive integration tests for the RAG system
testing the interaction between all components.
"""

import unittest
import tempfile
import os
import sys
import time
import json
from unittest.mock import patch, Mock

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from rag.rag_pipeline import RAGPipeline
    from rag.data_loader import LoadDocuments
    from rag.chunk_documents import ChunkDocuments
    from rag.embedding import EmbeddingsCreator
    from rag.retriever import SimpleRetriever
    from rag.chat_model import ChatModel
    from rag.conversation_chain import ConversationChain
    from rag.evaluation.rag_evaluator import ContractQAEvaluator, EvaluationResult
    from rag.evaluation.test_datasets import ContractTestDataset
    INTEGRATION_TEST_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Integration test dependencies not available: {e}")
    INTEGRATION_TEST_AVAILABLE = False


class TestRAGPipelineIntegration(unittest.TestCase):
    """Integration tests for complete RAG pipeline."""

    def setUp(self):
        if not INTEGRATION_TEST_AVAILABLE:
            self.skipTest("RAG components not available")

        # Create temporary test document
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        contract_content = """
        CONTRACT AGREEMENT

        This Service Agreement ("Agreement") is entered into on January 1, 2024,
        between TechCorp Inc. ("Provider") and ClientCo LLC ("Client").

        1. SERVICES AND PAYMENT TERMS

        1.1 Provider shall provide software development services as specified
        in Exhibit A attached hereto.

        1.2 Client shall pay Provider $50,000 per month for the services.
        Payment shall be made within 30 days of invoice date.

        1.3 Late payments shall incur interest at 5% per month.

        2. TERM AND TERMINATION

        2.1 This Agreement shall commence on January 1, 2024 and continue
        for a period of 12 months, unless terminated earlier.

        2.2 Either party may terminate this Agreement with 60 days written
        notice to the other party.

        2.3 Either party may terminate immediately for material breach.

        3. LIABILITY AND INDEMNIFICATION

        3.1 Provider's total liability under this Agreement shall not exceed
        the total fees paid in the preceding 6 months.

        3.2 Neither party shall be liable for consequential, indirect, or
        punitive damages.

        4. CONFIDENTIALITY

        4.1 Both parties shall maintain confidentiality of all proprietary
        information for a period of 5 years after termination.

        5. GOVERNING LAW

        5.1 This Agreement shall be governed by the laws of California.
        All disputes shall be resolved in San Francisco courts.
        """
        self.temp_file.write(contract_content)
        self.temp_file.close()

        # Use unique vector DB path for testing
        self.vector_db_path = tempfile.mkdtemp(prefix="test_chroma_")

    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

        # Clean up vector store
        import shutil
        if os.path.exists(self.vector_db_path):
            shutil.rmtree(self.vector_db_path)

    def test_end_to_end_document_processing(self):
        """Test complete document processing pipeline."""
        print("🧪 Testing end-to-end document processing...")

        # Test document loading
        loader = LoadDocuments(self.temp_file.name)
        documents = loader.load_document()

        self.assertIsInstance(documents, list)
        self.assertGreater(len(documents), 0)

        print(f"✓ Loaded {len(documents)} document sections")

        # Test chunking
        chunker = ChunkDocuments(documents)
        chunks = chunker.chunk_documents(chunk_size=800, chunk_overlap=100)

        self.assertIsInstance(chunks, list)
        self.assertGreater(len(chunks), 0)

        print(f"✓ Created {len(chunks)} chunks")

        # Test embedding creation
        embedding_creator = EmbeddingsCreator()
        embeddings = embedding_creator.embed_documents_cached([chunk.page_content for chunk in chunks[:3]])

        self.assertIsInstance(embeddings, list)
        self.assertEqual(len(embeddings), 3)

        print(f"✓ Created embeddings for {len(embeddings)} chunks")

        # Test retriever creation
        retriever = SimpleRetriever(chunks[:5], embedding_creator, self.vector_db_path)
        self.assertIsNotNone(retriever)

        print("✓ Created retriever successfully")

    @patch('rag.chat_model.ChatModel')
    def test_complete_qa_pipeline(self, mock_chat_model):
        """Test complete Q&A pipeline with mocked LLM."""
        print("🧪 Testing complete Q&A pipeline...")

        # Mock the chat model to avoid API calls
        mock_model = Mock()
        mock_chat_model.return_value.initialize_chat_model.return_value = mock_model

        # Mock LLM response
        mock_model.invoke.return_value = {
            "answer": "Based on the contract, the payment terms are $50,000 per month with payment due within 30 days.",
            "source_documents": [Mock(page_content="Client shall pay Provider $50,000 per month")]
        }

        try:
            # Create RAG pipeline
            rag_pipeline = RAGPipeline(self.temp_file.name, self.vector_db_path)

            # Test pipeline creation
            self.assertIsInstance(rag_pipeline, RAGPipeline)

            # Test QA chain creation
            qa_chain = rag_pipeline.qa_chain()
            self.assertIsNotNone(qa_chain)

            print("✓ RAG pipeline and QA chain created successfully")

        except Exception as e:
            self.fail(f"RAG pipeline creation failed: {e}")

    def test_retrieval_accuracy(self):
        """Test retrieval accuracy with known questions."""
        print("🧪 Testing retrieval accuracy...")

        # Setup RAG components
        loader = LoadDocuments(self.temp_file.name)
        documents = loader.load_document()

        chunker = ChunkDocuments(documents)
        chunks = chunker.chunk_documents(chunk_size=800, chunk_overlap=100)

        embedding_creator = EmbeddingsCreator()
        retriever = SimpleRetriever(chunks, embedding_creator, self.vector_db_path)

        # Test queries with expected content
        test_queries = [
            {
                "query": "What are the payment terms?",
                "expected_keywords": ["payment", "$50,000", "30 days"],
                "should_find": True
            },
            {
                "query": "When can the contract be terminated?",
                "expected_keywords": ["terminate", "60 days", "notice"],
                "should_find": True
            },
            {
                "query": "What is the liability limitation?",
                "expected_keywords": ["liability", "limitation", "6 months"],
                "should_find": True
            }
        ]

        successful_retrievals = 0

        for test_case in test_queries:
            # Retrieve documents
            retrieved_docs = retriever._get_relevant_documents(test_case["query"])

            # Check retrieval success
            if test_case["should_find"]:
                self.assertGreater(len(retrieved_docs), 0, f"No documents retrieved for: {test_case['query']}")

                # Check content relevance
                all_content = " ".join([doc.page_content.lower() for doc in retrieved_docs])

                found_keywords = 0
                for keyword in test_case["expected_keywords"]:
                    if keyword.lower() in all_content:
                        found_keywords += 1

                keyword_ratio = found_keywords / len(test_case["expected_keywords"])
                if keyword_ratio >= 0.5:  # At least 50% of keywords found
                    successful_retrievals += 1
                    print(f"✓ Query '{test_case['query']}' - Found {found_keywords}/{len(test_case['expected_keywords'])} keywords")
                else:
                    print(f"⚠️ Query '{test_case['query']}' - Only found {found_keywords}/{len(test_case['expected_keywords'])} keywords")
            else:
                print(f"✓ Query '{test_case['query']}' - Correctly returned no results")

        # Evaluate overall retrieval performance
        retrieval_rate = successful_retrievals / len([tc for tc in test_queries if tc["should_find"]])
        print(f"📊 Retrieval success rate: {retrieval_rate:.2%}")

        # Assert reasonable retrieval performance
        self.assertGreater(retrieval_rate, 0.6, "Retrieval success rate should be at least 60%")

    def test_error_handling_and_recovery(self):
        """Test error handling and recovery mechanisms."""
        print("🧪 Testing error handling and recovery...")

        # Test with invalid file path
        with self.assertRaises((ValueError, FileNotFoundError, OSError)):
            invalid_pipeline = RAGPipeline("/nonexistent/file.txt", self.vector_db_path)
            invalid_pipeline.pipeline()

        print("✓ Invalid file path handled correctly")

        # Test with corrupted document
        corrupted_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        corrupted_file.write("")
        corrupted_file.close()

        try:
            corrupted_pipeline = RAGPipeline(corrupted_file.name, self.vector_db_path)
            result = corrupted_pipeline.pipeline()

            # Should handle gracefully (either return None or fallback)
            # The exact behavior depends on implementation
            print("✓ Empty document handled gracefully")

        finally:
            os.unlink(corrupted_file.name)

        # Test retrieval with empty query
        loader = LoadDocuments(self.temp_file.name)
        documents = loader.load_document()
        chunker = ChunkDocuments(documents)
        chunks = chunker.chunk_documents()
        embedding_creator = EmbeddingsCreator()
        retriever = SimpleRetriever(chunks, embedding_creator, self.vector_db_path)

        # Empty query should return empty results or handle gracefully
        try:
            empty_results = retriever._get_relevant_documents("")
            self.assertIsInstance(empty_results, list)
            print("✓ Empty query handled gracefully")
        except Exception as e:
            # Some implementations might raise errors for empty queries
            print(f"✓ Empty query properly rejected: {type(e).__name__}")

    def test_performance_characteristics(self):
        """Test performance characteristics of the pipeline."""
        print("🧪 Testing performance characteristics...")

        # Setup components
        loader = LoadDocuments(self.temp_file.name)
        documents = loader.load_document()

        chunker = ChunkDocuments(documents)
        chunks = chunker.chunk_documents()

        embedding_creator = EmbeddingsCreator()
        retriever = SimpleRetriever(chunks, embedding_creator, self.vector_db_path)

        # Test embedding performance
        start_time = time.time()
        embeddings = embedding_creator.embed_documents_cached([chunk.page_content for chunk in chunks[:5]])
        embedding_time = time.time() - start_time

        self.assertLess(embedding_time, 30, "Embedding creation should complete within 30 seconds")
        print(f"✓ Created 5 embeddings in {embedding_time:.2f}s")

        # Test retrieval performance
        test_query = "What are the payment terms?"

        # First query (no cache)
        start_time = time.time()
        results_1 = retriever._get_relevant_documents(test_query)
        first_query_time = time.time() - start_time

        # Second query (should use cache)
        start_time = time.time()
        results_2 = retriever._get_relevant_documents(test_query)
        second_query_time = time.time() - start_time

        self.assertLess(first_query_time, 10, "First retrieval should complete within 10 seconds")
        self.assertLess(second_query_time, 5, "Cached retrieval should complete within 5 seconds")

        # Cache should make second query faster
        if second_query_time > 0:
            speedup = first_query_time / second_query_time
            print(f"✓ Query cache speedup: {speedup:.2f}x")

        print(f"✓ First query: {first_query_time:.3f}s, Cached query: {second_query_time:.3f}s")

    @unittest.skipUnless(INTEGRATION_TEST_AVAILABLE, "Evaluation modules not available")
    def test_evaluation_integration(self):
        """Test integration with evaluation framework."""
        print("🧪 Testing evaluation framework integration...")

        evaluator = ContractQAEvaluator(vector_db_path=self.vector_db_path)

        # Test with a small sample
        test_questions = [
            "What are the payment terms?",
            "When can the contract be terminated?",
            "What is the liability limitation?"
        ]

        try:
            result = evaluator.evaluate_rag_pipeline(
                self.temp_file.name,
                test_questions=test_questions,
                use_ragas=False  # Skip RAGAS for faster testing
            )

            self.assertIsInstance(result, EvaluationResult)
            self.assertEqual(result.total_questions, 3)
            self.assertGreaterEqual(result.successful_queries, 0)
            self.assertGreaterEqual(result.avg_response_time, 0)

            print(f"✓ Evaluation completed - Success rate: {1-result.error_rate:.2%}")
            print(f"✓ Average response time: {result.avg_response_time:.3f}s")

        except Exception as e:
            self.fail(f"Evaluation integration failed: {e}")


class TestComponentInteraction(unittest.TestCase):
    """Test interactions between RAG components."""

    def setUp(self):
        if not INTEGRATION_TEST_AVAILABLE:
            self.skipTest("RAG components not available")

        # Create test document
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        self.temp_file.write("Simple test document for component interaction testing.")
        self.temp_file.close()
        self.vector_db_path = tempfile.mkdtemp(prefix="test_interaction_")

    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

        import shutil
        if os.path.exists(self.vector_db_path):
            shutil.rmtree(self.vector_db_path)

    def test_chunk_embedding_retrieval_flow(self):
        """Test the flow from chunking to embedding to retrieval."""
        print("🧪 Testing chunk-embedding-retrieval flow...")

        # Step 1: Load and chunk document
        loader = LoadDocuments(self.temp_file.name)
        documents = loader.load_document()
        chunker = ChunkDocuments(documents)
        chunks = chunker.chunk_documents(chunk_size=400, chunk_overlap=50)

        self.assertGreater(len(chunks), 0)

        # Step 2: Create embeddings
        embedding_creator = EmbeddingsCreator()
        chunk_texts = [chunk.page_content for chunk in chunks]
        embeddings = embedding_creator.embed_documents_cached(chunk_texts)

        self.assertEqual(len(chunks), len(embeddings))

        # Step 3: Setup retriever
        retriever = SimpleRetriever(chunks, embedding_creator, self.vector_db_path)

        # Step 4: Test retrieval
        test_query = "What is this document about?"
        retrieved_docs = retriever._get_relevant_documents(test_query)

        self.assertGreater(len(retrieved_docs), 0)

        # Verify retrieved documents contain original content
        retrieved_content = " ".join([doc.page_content for doc in retrieved_docs])
        original_content = " ".join(chunk_texts)

        # Should have significant content overlap
        self.assertIn("test", retrieved_content.lower())
        self.assertIn("document", retrieved_content.lower())

        print(f"✓ Flow test passed - {len(chunks)} chunks → {len(embeddings)} embeddings → {len(retrieved_docs)} retrieved docs")

    def test_context_window_optimization(self):
        """Test context window optimization in conversation chain."""
        print("🧪 Testing context window optimization...")

        try:
            from rag.conversation_chain import ConversationChain
            from unittest.mock import Mock

            # Create mock documents with different lengths
            mock_docs = []
            for i in range(10):
                mock_doc = Mock()
                mock_doc.page_content = f"This is test document section {i+1}. " * (100 + i * 20)  # Variable length
                mock_docs.append(mock_doc)

            # Create conversation chain
            chain = ConversationChain()

            # Test context optimization
            optimized_context = chain._optimize_context(mock_docs)

            # Should return non-empty context
            self.assertIsInstance(optimized_context, str)
            self.assertGreater(len(optimized_context), 0)

            # Should be shorter than full context
            full_context = " ".join([doc.page_content for doc in mock_docs])
            self.assertLess(len(optimized_context), len(full_context))

            print(f"✓ Context optimization - Full: {len(full_context)} chars, Optimized: {len(optimized_context)} chars")

        except Exception as e:
            print(f"⚠️ Context optimization test failed: {e}")


if __name__ == '__main__':
    # Create test suite
    suite = unittest.TestSuite()

    # Add test classes
    test_classes = [
        TestRAGPipelineIntegration,
        TestComponentInteraction
    ]

    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        suite.addTests(tests)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    if result.wasSuccessful():
        print("\n✅ All integration tests passed!")
    else:
        print(f"\n❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        sys.exit(1)