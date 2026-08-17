"""
Tests for section-reference extraction and the exact-search fallback.

Regression cover for the retriever's hard-coded section lookup: the previous
implementation only reacted to the literal string 'IV.15', so every other
clause reference silently fell through to semantic search.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from langchain_core.documents import Document
    from rag.retriever import SimpleRetriever, extract_section_references
    IMPORTS_AVAILABLE = True
except ImportError as e:
    IMPORTS_AVAILABLE = False
    IMPORT_ERROR = str(e)


@unittest.skipUnless(IMPORTS_AVAILABLE, "retriever dependencies not installed")
class TestExtractSectionReferences(unittest.TestCase):

    def test_finds_prefixed_and_bare_form(self):
        refs = extract_section_references("what does Section IV.15 say?")
        self.assertIn("Section IV.15", refs)
        self.assertIn("IV.15", refs)
        # most specific first, so the exact search tries the tighter match first
        self.assertLess(refs.index("Section IV.15"), refs.index("IV.15"))

    def test_finds_references_other_than_the_old_hard_coded_one(self):
        for query, expected in [
            ("summarise Section II.3", "Section II.3"),
            ("what is in Article IV?", "Article IV"),
            ("compare X.7 with the rest", "X.7"),
        ]:
            with self.subTest(query=query):
                self.assertIn(expected, extract_section_references(query))

    def test_case_insensitive(self):
        self.assertTrue(extract_section_references("see section iv.15 please"))

    def test_no_reference_returns_empty(self):
        self.assertEqual(extract_section_references("what are the payment terms?"), [])

    def test_deduplicates_repeated_mentions(self):
        refs = extract_section_references("Section IV.15 and again Section  IV.15")
        self.assertEqual(len([r for r in refs if r.lower().startswith("section")]), 1)


@unittest.skipUnless(IMPORTS_AVAILABLE, "retriever dependencies not installed")
class TestExactSectionSearch(unittest.TestCase):

    def _retriever(self, texts):
        # bypass __init__: _exact_section_search only needs _chunks, and building
        # a real retriever would require an embedding model
        retriever = object.__new__(SimpleRetriever)
        object.__setattr__(retriever, '_chunks', [Document(page_content=t) for t in texts])
        return retriever

    def test_finds_clause_the_old_implementation_missed(self):
        r = self._retriever([
            "Section IV.15 - Termination for convenience.",
            "Section II.3 - Payment schedule and late fees.",
            "Unrelated boilerplate about governing law.",
        ])
        matches = r._exact_section_search("what does Section II.3 cover?")
        self.assertEqual(len(matches), 1)
        self.assertIn("Payment schedule", matches[0][0].page_content)
        self.assertEqual(matches[0][2], 'exact-search')

    def test_tolerates_doubled_spacing_from_ocr(self):
        r = self._retriever(["Section  IV.15 - Termination for convenience."])
        self.assertEqual(len(r._exact_section_search("Section IV.15?")), 1)

    def test_prefixed_form_wins_over_bare_form(self):
        # the bare "II.3" appears first in the corpus; the prefixed reference is
        # more specific and must be searched first. Regression: escaping the whole
        # reference before splicing in \s+ broke every prefixed match silently.
        r = self._retriever([
            "a passing mention of II.3 with no clause text",
            "Section II.3 - Payment schedule and late fees.",
        ])
        matches = r._exact_section_search("what does Section II.3 cover?", limit=1)
        self.assertEqual(len(matches), 1)
        self.assertIn("Payment schedule", matches[0][0].page_content)

    def test_no_match_returns_empty(self):
        r = self._retriever(["Section IV.15 - Termination."])
        self.assertEqual(r._exact_section_search("what does Section IX.9 say?"), [])

    def test_does_not_return_the_same_chunk_twice(self):
        # "Section IV.15" and the bare "IV.15" both match this chunk
        r = self._retriever(["Section IV.15 - Termination for convenience."])
        matches = r._exact_section_search("Section IV.15")
        self.assertEqual(len(matches), 1)

    def test_respects_limit(self):
        r = self._retriever([f"Section IV.15 - copy {i}" for i in range(6)])
        self.assertEqual(len(r._exact_section_search("Section IV.15", limit=2)), 2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
