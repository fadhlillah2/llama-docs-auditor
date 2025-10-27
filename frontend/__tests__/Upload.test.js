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
      json: () => Promise.resolve({ message: 'File uploaded successfully' })
    })
  })

  test('renders upload component', () => {
    render(<Upload />)
    
    // Check for main elements
    expect(screen.getByText(/Upload your file here/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument()
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
    
    if (form) {
      fireEvent.submit(form)
      
      expect(swal.fire).toHaveBeenCalledWith({
        title: "File loading...",
        icon: "success",
        toast: true,
        timer: 6000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      })
    }
  })
})