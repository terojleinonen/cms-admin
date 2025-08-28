/**
 * DataTable Component Tests
 * Tests for reusable data table with sorting, filtering, and pagination
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '@/components/ui/DataTable'
import { TableColumn, FilterOption, PaginationInfo } from '@/lib/types'

interface TestData {
  id: string
  name: string
  email: string
  status: string
}

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active' }
]

const mockColumns: TableColumn<TestData>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { 
    key: 'status', 
    label: 'Status', 
    render: (value) => (
      <span className={`badge ${value === 'active' ? 'badge-success' : 'badge-error'}`}>
        {value}
      </span>
    )
  }
]

const mockFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  }
]

const mockPagination: PaginationInfo = {
  page: 1,
  limit: 10,
  total: 25,
  totalPages: 3
}

describe('DataTable', () => {
  it('renders table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('active')[0]).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )
    
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No users found"
      />
    )
    
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('handles sorting when column is clicked', async () => {
    const mockOnSort = jest.fn()
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={mockOnSort}
      />
    )
    
    await user.click(screen.getByText('Name'))
    
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc')
  })

  it('handles search input', async () => {
    const mockOnSearch = jest.fn()
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSearch={mockOnSearch}
        searchable={true}
      />
    )
    
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'john')
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('john')
    })
  })

  it('renders filters when provided', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        filters={mockFilters}
      />
    )
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('handles filter changes', async () => {
    const mockOnFilter = jest.fn()
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        filters={mockFilters}
        onFilter={mockOnFilter}
      />
    )
    
    // Open filters
    await user.click(screen.getByText('Filters'))
    
    // Change filter value
    const statusSelect = screen.getByDisplayValue('All')
    await user.selectOptions(statusSelect, 'active')
    
    expect(mockOnFilter).toHaveBeenCalledWith({ status: 'active' })
  })

  it('renders pagination when provided', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
      />
    )
    
    expect(screen.getByText(/Showing 1 to \d+ of 25 results/)).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('handles page changes', async () => {
    const mockOnPageChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
      />
    )
    
    await user.click(screen.getByText('Next'))
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
      />
    )
    
    expect(screen.getByText('Previous')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    const lastPagePagination = { ...mockPagination, page: 3 }
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={lastPagePagination}
      />
    )
    
    expect(screen.getByText('Next')).toBeDisabled()
  })

  it('renders custom cell content', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )
    
    // Check that the custom status render function is working
    const statusElements = screen.getAllByText('active')
    expect(statusElements[0]).toHaveClass('badge-success')
  })

  it('clears filters when clear button is clicked', async () => {
    const mockOnFilter = jest.fn()
    const mockOnSearch = jest.fn()
    const user = userEvent.setup()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        filters={mockFilters}
        onFilter={mockOnFilter}
        onSearch={mockOnSearch}
      />
    )
    
    // Open filters and set a filter
    await user.click(screen.getByText('Filters'))
    const statusSelect = screen.getByDisplayValue('All')
    await user.selectOptions(statusSelect, 'active')
    
    // Clear filters
    await user.click(screen.getByText('Clear'))
    
    expect(mockOnFilter).toHaveBeenCalledWith({})
    expect(mockOnSearch).toHaveBeenCalledWith('')
  })
})