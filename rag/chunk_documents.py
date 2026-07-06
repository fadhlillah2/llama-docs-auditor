from langchain.text_splitter import RecursiveCharacterTextSplitter
import re

class ChunkDocuments:
    def __init__(self, documents):
        self.documents = documents

    def chunk_documents(self,chunk_size=1000, chunk_overlap=50):
        """Splits text into smaller chunks for processing."""
        for page in self.documents:
            page.page_content = self._remove_special_characters(page.page_content)
            # More aggressive whitespace normalization to fix concatenated words
            page.page_content = re.sub(r'\s+', ' ', page.page_content)
            # Fix common concatenated word patterns from PDF extraction
            page.page_content = re.sub(r'([a-z])([A-Z])', r'\1 \2', page.page_content)
            # Fix BusinessDay -> Business Day and similar patterns
            page.page_content = re.sub(r'(Business|Working|Calendar)(Day|Week)', r'\1 \2', page.page_content)
            # Fix specific patterns like "Daymeans" -> "Day means"
            page.page_content = re.sub(r'(Day|Week|Act|Law|Agreement)([a-z])', r'\1 \2', page.page_content)
            # Fix patterns like "priorto" -> "prior to", "afteritis" -> "after it is"
            page.page_content = re.sub(r'(prior|after|other|than|from|with|for)([a-z])', r'\1 \2', page.page_content)
            # Fix "meansany" -> "means any" and similar patterns
            page.page_content = re.sub(r'(means)([a-z])', r'\1 \2', page.page_content)
            # Fix "anyday" -> "any day", "otherthan" -> "other than", etc.
            page.page_content = re.sub(r'(any|other|than|from|with|for|which|that|this|when|where|here|there)([a-z])', r'\1 \2', page.page_content)
            # Fix common PDF concatenation issues
            page.page_content = re.sub(r'([a-z]{2,})([A-Z][a-z]+)', r'\1 \2', page.page_content)
            # Fix specific concatenated words that appear in contracts
            page.page_content = re.sub(r'(banksin)', r'banks in', page.page_content)
            page.page_content = re.sub(r'(California,USA)', r'California, USA', page.page_content)
            page.page_content = re.sub(r'(Tel Aviv,Israel)', r'Tel Aviv, Israel', page.page_content)
            # Fix spaces around punctuation and quotes
            page.page_content = re.sub(r'([a-z])"([A-Z])', r'\1" \2', page.page_content)
            page.page_content = re.sub(r'([a-z])([A-Z])', r'\1 \2', page.page_content)
            # Clean up multiple spaces and trim
            page.page_content = re.sub(r'\s+', ' ', page.page_content).strip()

        text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n\n", "\n", ".", " ", ""],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        chunks = text_splitter.split_documents(self.documents)

        # Add document context to each chunk for better AI recognition
        for chunk in chunks:
            source_file = chunk.metadata.get('source', 'unknown document')
            title = chunk.metadata.get('title', 'document')
            page = chunk.metadata.get('page_label', chunk.metadata.get('page', 'unknown page'))

            # Extract filename from source path
            filename = source_file.split('/')[-1] if '/' in source_file else source_file

            # Add document context header
            doc_context = f"[Document: {filename} | Title: {title} | Page: {page}] "
            chunk.page_content = doc_context + chunk.page_content

        return chunks
    
    def _remove_special_characters(self, text):
        # Define a regex pattern to match the special characters, but preserve spaces
        pattern = r'-\t|●|\[|\]'  # Remove \n from pattern - let the outer cleanup handle newlines
        # Use re.sub() to replace matches of the pattern with a space
        cleaned_string = re.sub(pattern, ' ', text)
        return cleaned_string
