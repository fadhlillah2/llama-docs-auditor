import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Upload from '../src/components/Upload'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  })
}))

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('Upload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        session_id: 'test-session-id-123',
        message: 'File uploaded successfully'
      })
    })
  })

  test('renders upload component', () => {
    render(<Upload />)

    // Check for main elements (component shows a heading and a submit button
    // labeled via aria-label, not literal "Submit" text)
    expect(screen.getByText(/Upload Your Documents/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upload and analyze documents/i })).toBeInTheDocument()
  })

  test('displays file input', () => {
    render(<Upload />)
    
    // The file input should be present
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  test('shows loading state when uploading', async () => {
    render(<Upload />)
    
    const form = document.querySelector('form')
    const fileInput = document.querySelector('input[type="file"]')
    
    // Create a test file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Simulate file selection and form submission
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } })
    }
    
    if (form) {
      fireEvent.submit(form)
      
      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
      })
    }
  })

  test('calls fetch with correct URL when form is submitted', async () => {
    render(<Upload />)

    const form = document.querySelector('form')
    const fileInput = document.querySelector('input[type="file"]')

    // A file must be selected first - submitting with nothing selected
    // just shows a "select files first" warning and never calls fetch.
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } })
    }

    if (form) {
      fireEvent.submit(form)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8081/upload_file', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })
    }
  })

  test('shows SweetAlert toast when form is submitted', async () => {
    const swal = require('sweetalert2')
    render(<Upload />)

    const form = document.querySelector('form')
    const fileInput = document.querySelector('input[type="file"]')

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } })
    }

    if (form) {
      fireEvent.submit(form)

      // Success toast is fired only after the (mocked) upload response
      // resolves and a short simulated-processing delay elapses.
      await waitFor(() => {
        expect(swal.fire).toHaveBeenCalledWith({
          title: "File uploaded successfully!",
          text: "You can now chat with your document using the chat interface.",
          icon: "success",
          toast: true,
          timer: 5000,
          position: 'top-right',
          timerProgressBar: true,
          showConfirmButton: false,
        })
      }, { timeout: 3000 })
    }
  })
})