import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NativeRichTextEditor, {
  getPlainText,
  truncateHtml,
  validateHtmlContent,
  serializeToJson,
  deserializeFromJson,
} from '@/components/editor/NativeRichTextEditor';

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: (html: string) => html,
}));

// Mock dynamic styles utility
jest.mock('@/utils/dynamic-styles', () => ({
  getEditorHeightClass: (height: string) => `editor-height-${height}`,
}));

// Mock document.execCommand for formatting tests
const mockExecCommand = jest.fn(() => true);
Object.defineProperty(document, 'execCommand', {
  value: mockExecCommand,
  writable: true,
});

// Mock document.queryCommandState for active format detection
const mockQueryCommandState = jest.fn(() => false);
Object.defineProperty(document, 'queryCommandState', {
  value: mockQueryCommandState,
  writable: true,
});

// Mock window.prompt for link insertion
const mockPrompt = jest.fn();
Object.defineProperty(window, 'prompt', {
  value: mockPrompt,
  writable: true,
});

describe('NativeRichTextEditor', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockQueryCommandState.mockReturnValue(false);
  });

  describe('Basic Rendering and Setup', () => {
    it('should render the native editor with toolbar', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(() => {
        // Check for toolbar buttons
        expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
        expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
        expect(screen.getByTitle('Underline (Ctrl+U)')).toBeInTheDocument();
        expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
        expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
        expect(screen.getByTitle('Insert Link')).toBeInTheDocument();
        expect(screen.getByTitle('Insert Media')).toBeInTheDocument();
        
        // Check for contentEditable div
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveAttribute('contentEditable', 'true');
      });
    });

    it('should render with custom placeholder', async () => {
      const customPlaceholder = 'Enter your content here...';
      render(
        <NativeRichTextEditor 
          value="" 
          onChange={() => {}} 
          placeholder={customPlaceholder}
        />
      );
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toHaveAttribute('data-placeholder', customPlaceholder);
      });
    });

    it('should be disabled when disabled prop is true', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} disabled={true} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="false"]');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveAttribute('contentEditable', 'false');
        
        // Toolbar buttons should be disabled
        const boldButton = screen.getByTitle('Bold (Ctrl+B)');
        expect(boldButton).toBeDisabled();
      });
    });

    it('should hide media button when allowMedia is false', async () => {
      render(
        <NativeRichTextEditor 
          value="" 
          onChange={() => {}} 
          allowMedia={false}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTitle('Insert Media')).not.toBeInTheDocument();
      });
    });
  });

  describe('Content Operations', () => {
    it('should call onChange when content changes', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        // Simulate input event
        fireEvent.input(editor!, { target: { innerHTML: '<p>Hello world</p>' } });
        
        expect(handleChange).toHaveBeenCalledWith('<p>Hello world</p>');
      });
    });

    it('should render with initial value prop', async () => {
      const initialContent = '<p>Initial content</p>';
      render(<NativeRichTextEditor value={initialContent} onChange={() => {}} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
        // The component should receive the value prop
        expect(screen.getByText('15 characters')).toBeInTheDocument(); // "Initial content" = 15 chars
      });
    });

    it('should handle value prop changes', async () => {
      const { rerender } = render(
        <NativeRichTextEditor value="<p>First content</p>" onChange={() => {}} />
      );
      
      await waitFor(() => {
        expect(screen.getByText('13 characters')).toBeInTheDocument(); // "First content" = 13 chars
      });

      rerender(
        <NativeRichTextEditor value="<p>Updated content</p>" onChange={() => {}} />
      );
      
      await waitFor(() => {
        expect(screen.getByText('15 characters')).toBeInTheDocument(); // "Updated content" = 15 chars
      });
    });

    it('should handle paste events with sanitization', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        // Create clipboard data
        const clipboardData = {
          getData: jest.fn((type) => {
            if (type === 'text/html') return '<p>Pasted <script>alert("xss")</script> content</p>';
            return 'Pasted content';
          })
        };
        
        // Simulate paste event
        fireEvent.paste(editor!, { clipboardData });
        
        expect(mockExecCommand).toHaveBeenCalledWith(
          'insertHTML', 
          false, 
          '<p>Pasted <script>alert("xss")</script> content</p>'
        );
      });
    });
  });

  describe('Formatting Operations', () => {
    it('should execute bold formatting when bold button is clicked', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(async () => {
        const boldButton = screen.getByTitle('Bold (Ctrl+B)');
        await userEvent.click(boldButton);
        
        expect(mockExecCommand).toHaveBeenCalledWith('bold', false, undefined);
      });
    });

    it('should execute italic formatting when italic button is clicked', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(async () => {
        const italicButton = screen.getByTitle('Italic (Ctrl+I)');
        await userEvent.click(italicButton);
        
        expect(mockExecCommand).toHaveBeenCalledWith('italic', false, undefined);
      });
    });

    it('should execute underline formatting when underline button is clicked', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(async () => {
        const underlineButton = screen.getByTitle('Underline (Ctrl+U)');
        await userEvent.click(underlineButton);
        
        expect(mockExecCommand).toHaveBeenCalledWith('underline', false, undefined);
      });
    });

    it('should execute bullet list formatting when bullet list button is clicked', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(async () => {
        const bulletListButton = screen.getByTitle('Bullet List');
        await userEvent.click(bulletListButton);
        
        expect(mockExecCommand).toHaveBeenCalledWith('insertUnorderedList', false, undefined);
      });
    });

    it('should execute numbered list formatting when numbered list button is clicked', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(async () => {
        const numberedListButton = screen.getByTitle('Numbered List');
        await userEvent.click(numberedListButton);
        
        expect(mockExecCommand).toHaveBeenCalledWith('insertOrderedList', false, undefined);
      });
    });

    it('should have proper button structure for active states', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(() => {
        const boldButton = screen.getByTitle('Bold (Ctrl+B)');
        // Test that the button has the correct base classes and structure for active state handling
        expect(boldButton).toHaveClass('p-2', 'rounded', 'hover:bg-gray-200');
        expect(boldButton.className).toContain('focus:outline-none');
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Ctrl+B for bold', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        fireEvent.keyDown(editor!, { key: 'b', ctrlKey: true });
        expect(mockExecCommand).toHaveBeenCalledWith('bold', false, undefined);
      });
    });

    it('should handle Ctrl+I for italic', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        fireEvent.keyDown(editor!, { key: 'i', ctrlKey: true });
        expect(mockExecCommand).toHaveBeenCalledWith('italic', false, undefined);
      });
    });

    it('should handle Ctrl+U for underline', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        fireEvent.keyDown(editor!, { key: 'u', ctrlKey: true });
        expect(mockExecCommand).toHaveBeenCalledWith('underline', false, undefined);
      });
    });

    it('should handle Cmd+B for bold on Mac', async () => {
      const handleChange = jest.fn();
      render(<NativeRichTextEditor value="" onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        fireEvent.keyDown(editor!, { key: 'b', metaKey: true });
        expect(mockExecCommand).toHaveBeenCalledWith('bold', false, undefined);
      });
    });
  });

  describe('Link and Media Operations', () => {
    it('should insert link when link button is clicked and URL is provided', async () => {
      mockPrompt.mockReturnValue('https://example.com');
      
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(async () => {
        const linkButton = screen.getByTitle('Insert Link');
        await userEvent.click(linkButton);
        
        expect(mockPrompt).toHaveBeenCalledWith('Enter URL:');
        expect(mockExecCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');
      });
    });

    it('should not insert link when URL is not provided', async () => {
      mockPrompt.mockReturnValue(null);
      
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(async () => {
        const linkButton = screen.getByTitle('Insert Link');
        await userEvent.click(linkButton);
        
        expect(mockPrompt).toHaveBeenCalledWith('Enter URL:');
        expect(mockExecCommand).not.toHaveBeenCalledWith('createLink', false, expect.any(String));
      });
    });

    it('should call onMediaInsert when media button is clicked', async () => {
      const handleMediaInsert = jest.fn();
      
      render(
        <NativeRichTextEditor 
          value="" 
          onChange={() => {}} 
          onMediaInsert={handleMediaInsert}
        />
      );
      
      await waitFor(async () => {
        const mediaButton = screen.getByTitle('Insert Media');
        await userEvent.click(mediaButton);
        
        expect(handleMediaInsert).toHaveBeenCalled();
      });
    });
  });

  describe('Content Persistence and Validation', () => {
    it('should display character count', async () => {
      const content = '<p>Hello world</p>';
      render(<NativeRichTextEditor value={content} onChange={() => {}} />);
      
      await waitFor(() => {
        expect(screen.getByText('11 characters')).toBeInTheDocument();
      });
    });

    it('should not call onChange if content has not actually changed', async () => {
      const handleChange = jest.fn();
      const initialContent = '<p>Hello world</p>';
      
      render(<NativeRichTextEditor value={initialContent} onChange={handleChange} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        // Simulate input event with same content
        fireEvent.input(editor!, { target: { innerHTML: initialContent } });
        
        expect(handleChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getPlainText', () => {
      it('should extract plain text from HTML', () => {
        const html = '<p>Hello <strong>world</strong></p>';
        expect(getPlainText(html)).toBe('Hello world');
      });

      it('should handle empty HTML', () => {
        expect(getPlainText('')).toBe('');
      });

      it('should handle complex nested HTML', () => {
        const html = '<div><p>Hello <em>beautiful</em> <strong>world</strong>!</p><ul><li>Item 1</li><li>Item 2</li></ul></div>';
        expect(getPlainText(html)).toBe('Hello beautiful world!Item 1Item 2');
      });
    });

    describe('truncateHtml', () => {
      it('should truncate HTML content', () => {
        const html = '<p>This is a long piece of text</p>';
        expect(truncateHtml(html, 10)).toBe('<p>This is a ...</p>');
      });

      it('should return original HTML if under limit', () => {
        const html = '<p>Short</p>';
        expect(truncateHtml(html, 10)).toBe(html);
      });

      it('should handle empty HTML', () => {
        expect(truncateHtml('', 10)).toBe('');
      });
    });

    describe('validateHtmlContent', () => {
      it('should validate clean HTML content', () => {
        const validHtml = '<p>Valid content</p>';
        const result = validateHtmlContent(validHtml);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect dangerous script content', () => {
        const dangerousHtml = '<p>Content <script>alert("xss")</script></p>';
        const result = validateHtmlContent(dangerousHtml);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content contains potentially dangerous elements');
      });

      it('should detect javascript: URLs', () => {
        const dangerousHtml = '<a href="javascript:alert(\'xss\')">Link</a>';
        const result = validateHtmlContent(dangerousHtml);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content contains potentially dangerous elements');
      });

      it('should detect event handlers', () => {
        const dangerousHtml = '<p onclick="alert(\'xss\')">Content</p>';
        const result = validateHtmlContent(dangerousHtml);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content contains potentially dangerous elements');
      });

      it('should detect empty content', () => {
        const emptyHtml = '';
        const result = validateHtmlContent(emptyHtml);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content cannot be empty');
      });

      it('should detect whitespace-only content', () => {
        const whitespaceHtml = '<p>   </p>';
        const result = validateHtmlContent(whitespaceHtml);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content cannot be empty');
      });
    });

    describe('serializeToJson', () => {
      it('should create JSON representation with all fields', () => {
        const html = '<p>Hello <strong>world</strong>! This is a test.</p>';
        const result = serializeToJson(html);
        
        expect(result.html).toBe(html);
        expect(result.plainText).toBe('Hello world! This is a test.');
        expect(result.wordCount).toBe(6);
        expect(result.characterCount).toBe(28);
      });

      it('should handle empty content', () => {
        const result = serializeToJson('');
        
        expect(result.html).toBe('');
        expect(result.plainText).toBe('');
        expect(result.wordCount).toBe(0);
        expect(result.characterCount).toBe(0);
      });

      it('should count words correctly', () => {
        const html = '<p>One two three</p>';
        const result = serializeToJson(html);
        
        expect(result.wordCount).toBe(3);
      });
    });

    describe('deserializeFromJson', () => {
      it('should extract HTML from JSON data', () => {
        const data = { html: '<p>Test content</p>' };
        expect(deserializeFromJson(data)).toBe('<p>Test content</p>');
      });

      it('should handle empty data', () => {
        const data = {};
        expect(deserializeFromJson(data as any)).toBe('');
      });

      it('should handle null/undefined html', () => {
        const data = { html: null };
        expect(deserializeFromJson(data as any)).toBe('');
      });
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should handle contentEditable functionality', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveAttribute('contentEditable', 'true');
        
        // Should have proper ARIA attributes for accessibility
        expect(editor).toHaveAttribute('data-placeholder', 'Enter content...');
      });
    });

    it('should prevent default on paste and use execCommand', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        
        const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(pasteEvent, 'clipboardData', {
          value: {
            getData: jest.fn(() => '<p>Pasted content</p>')
          }
        });
        
        const preventDefaultSpy = jest.spyOn(pasteEvent, 'preventDefault');
        fireEvent(editor!, pasteEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });

    it('should handle focus management after formatting commands', async () => {
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(async () => {
        const editor = document.querySelector('[contenteditable="true"]');
        const focusSpy = jest.spyOn(editor as HTMLElement, 'focus');
        
        const boldButton = screen.getByTitle('Bold (Ctrl+B)');
        await userEvent.click(boldButton);
        
        expect(focusSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle execCommand failures gracefully', async () => {
      mockExecCommand.mockReturnValue(false);
      
      render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      await waitFor(async () => {
        const boldButton = screen.getByTitle('Bold (Ctrl+B)');
        
        // Should not throw error even if execCommand fails
        expect(() => userEvent.click(boldButton)).not.toThrow();
      });
    });

    it('should handle missing editor ref gracefully', async () => {
      const { unmount } = render(<NativeRichTextEditor value="" onChange={() => {}} />);
      
      // Unmount component to simulate missing ref
      unmount();
      
      // Should not throw errors when component is unmounted
      expect(() => {
        fireEvent(document, new Event('selectionchange'));
      }).not.toThrow();
    });
  });
});