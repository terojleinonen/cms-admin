/**
 * Advanced Media Management Tests
 * Tests for folder organization, bulk operations, and metadata editing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MediaFolderTree from '../../components/media/MediaFolderTree'
import MediaBulkActions from '../../components/media/MediaBulkActions'
import MediaMetadataEditor from '../../components/media/MediaMetadataEditor'

// Mock fetch
global.fetch = jest.fn()

describe('MediaFolderTree', () => {
  const mockOnFolderSelect = jest.fn()
  const mockOnFolderCreate = jest.fn()
  const mockOnFolderRename = jest.fn()
  const mockOnFolderDelete = jest.fn()

  const mockFolders = [
    {
      id: 'folder1',
      name: 'Images',
      parentId: null,
      fileCount: 5,
      children: []
    },
    {
      id: 'folder2',
      name: 'Documents',
      parentId: null,
      fileCount: 3,
      children: []
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render folder tree correctly', async () => {
    render(
      <MediaFolderTree
        folders={mockFolders}
        selectedFolderId={null}
        onFolderSelect={mockOnFolderSelect}
        onFolderCreate={mockOnFolderCreate}
        onFolderRename={mockOnFolderRename}
        onFolderDelete={mockOnFolderDelete}
      />
    )

    expect(screen.getByText('All Files')).toBeInTheDocument()
    expect(screen.getByText('Images')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
  })

  it('should handle folder selection', async () => {
    render(
      <MediaFolderTree
        folders={mockFolders}
        selectedFolderId={null}
        onFolderSelect={mockOnFolderSelect}
        onFolderCreate={mockOnFolderCreate}
        onFolderRename={mockOnFolderRename}
        onFolderDelete={mockOnFolderDelete}
      />
    )

    fireEvent.click(screen.getByText('Images'))
    expect(mockOnFolderSelect).toHaveBeenCalledWith('folder1')
  })
})

describe('MediaBulkActions', () => {
  const mockOnClearSelection = jest.fn()
  const mockOnBulkDelete = jest.fn()
  const mockOnBulkMove = jest.fn()
  const mockOnBulkTag = jest.fn()
  const mockOnBulkDownload = jest.fn()

  const mockSelectedFiles = [
    {
      id: 'file1',
      name: 'image1.jpg',
      type: 'image/jpeg',
      size: 1024000,
      url: '/uploads/image1.jpg',
      folderId: null,
      tags: ['test'],
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'file2',
      name: 'image2.jpg',
      type: 'image/jpeg',
      size: 2048000,
      url: '/uploads/image2.jpg',
      folderId: null,
      tags: ['test'],
      createdAt: '2024-01-02T00:00:00Z'
    }
  ]

  const mockFolders = [
    { id: 'folder1', name: 'Images' },
    { id: 'folder2', name: 'Documents' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render bulk actions when files are selected', () => {
    render(
      <MediaBulkActions
        selectedFiles={mockSelectedFiles}
        onClearSelection={mockOnClearSelection}
        onBulkDelete={mockOnBulkDelete}
        onBulkMove={mockOnBulkMove}
        onBulkTag={mockOnBulkTag}
        onBulkDownload={mockOnBulkDownload}
        folders={mockFolders}
      />
    )

    expect(screen.getByText('2 files selected')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('should handle bulk delete', () => {
    render(
      <MediaBulkActions
        selectedFiles={mockSelectedFiles}
        onClearSelection={mockOnClearSelection}
        onBulkDelete={mockOnBulkDelete}
        onBulkMove={mockOnBulkMove}
        onBulkTag={mockOnBulkTag}
        onBulkDownload={mockOnBulkDownload}
        folders={mockFolders}
      />
    )

    fireEvent.click(screen.getByText('Delete'))
    const deleteButtons = screen.getAllByText('Delete Files')
    fireEvent.click(deleteButtons[1]) // Click the button in the dialog, not the heading
    expect(mockOnBulkDelete).toHaveBeenCalledWith(['file1', 'file2'])
  })
})

describe('MediaMetadataEditor', () => {
  const mockOnSave = jest.fn()
  const mockOnClose = jest.fn()

  const mockFile = {
    id: 'file1',
    name: 'test-image.jpg',
    type: 'image/jpeg',
    size: 1024000,
    url: '/uploads/test-image.jpg',
    folderId: null,
    tags: ['test'],
    createdAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render metadata editor correctly', () => {
    render(
      <MediaMetadataEditor
        file={mockFile}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Edit Media Details')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test-image.jpg')).toBeInTheDocument()
  })

  it('should handle metadata save', () => {
    render(
      <MediaMetadataEditor
        file={mockFile}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    const nameInput = screen.getByDisplayValue('test-image.jpg')
    fireEvent.change(nameInput, { target: { value: 'updated-image.jpg' } })

    fireEvent.click(screen.getByText('Save Changes'))
    expect(mockOnSave).toHaveBeenCalledWith('file1', expect.objectContaining({
      name: 'updated-image.jpg'
    }))
  })
})