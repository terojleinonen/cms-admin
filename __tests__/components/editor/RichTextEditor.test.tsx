import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor, {
  getPlainText,
  truncateHtml,
  validateHtmlContent,
  serializeToJson,
  deserializeFromJson,
} from '@/components/editor/RichTextEditor';

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: (html: string) => html,
}));

// Mock document.execCommand for formatting tests
Object.defineProperty(document, 'execCommand', {
  value: jest.fn(() => true),
  writable: true,
});

// Mock document.queryCommandState for active format detection
Object.defineProperty(document, 'queryCommandState', {
  value: jest.fn(() => false),
  writable: true,
});

import { act } from 'react';

describe('RichTextEditor', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should render the native editor with toolbar', async () => {
    await act(async () => {
      render(<RichTextEditor value="" onChange={() => {}} />);
    });
    
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

  it('should call onChange when content changes', async () => {
    const handleChange = jest.fn();
    await act(async () => {
      render(<RichTextEditor value="" onChange={handleChange} />);
    });
    
    const editor = document.querySelector('[contenteditable="true"]');
    
    // Simulate input event
    fireEvent.input(editor, { target: { innerHTML: '<p>Hello world</p>' } });
    
    expect(handleChange).toHaveBeenCalledWith('<p>Hello world</p>');
  });

  it('should execute formatting commands when toolbar buttons are clicked', async () => {
    const handleChange = jest.fn();
    await act(async () => {
      render(<RichTextEditor value="" onChange={handleChange} />);
    });
    
    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    const italicButton = screen.getByTitle('Italic (Ctrl+I)');
    
    await userEvent.click(boldButton);
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
    
    await userEvent.click(italicButton);
    expect(document.execCommand).toHaveBeenCalledWith('italic', false, undefined);
  });

  it('should handle keyboard shortcuts', async () => {
    const handleChange = jest.fn();
    await act(async () => {
      render(<RichTextEditor value="" onChange={handleChange} />);
    });
    
    const editor = document.querySelector('[contenteditable="true"]');
    
    // Test Ctrl+B for bold
    fireEvent.keyDown(editor, { key: 'b', ctrlKey: true });
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
    
    // Test Ctrl+I for italic
    fireEvent.keyDown(editor, { key: 'i', ctrlKey: true });
    expect(document.execCommand).toHaveBeenCalledWith('italic', false, undefined);
  });

  it('should be disabled when disabled prop is true', async () => {
    await act(async () => {
      render(<RichTextEditor value="" onChange={() => {}} disabled={true} />);
    });
    
    const editor = document.querySelector('[contenteditable="false"]');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('contentEditable', 'false');
    
    // Toolbar buttons should be disabled
    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    expect(boldButton).toBeDisabled();
  });

  describe('utility functions', () => {
    it('getPlainText should extract plain text from HTML', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      expect(getPlainText(html)).toBe('Hello world');
    });

    it('truncateHtml should truncate HTML content', () => {
      const html = '<p>This is a long piece of text</p>';
      expect(truncateHtml(html, 10)).toBe('<p>This is a ...</p>');
    });

    it('validateHtmlContent should validate HTML content', () => {
      const validHtml = '<p>Valid content</p>';
      const invalidHtml = '<p>Invalid content <script>alert("xss")</script></p>';
      expect(validateHtmlContent(validHtml).isValid).toBe(true);
      expect(validateHtmlContent(invalidHtml).isValid).toBe(false);
    });

    it('validateHtmlContent should detect empty content', () => {
      const emptyHtml = '';
      const whitespaceHtml = '<p>   </p>';
      expect(validateHtmlContent(emptyHtml).isValid).toBe(false);
      expect(validateHtmlContent(whitespaceHtml).isValid).toBe(false);
    });

    it('serializeToJson should create JSON representation', () => {
      const html = '<p>Hello <strong>world</strong>! This is a test.</p>';
      const result = serializeToJson(html);
      
      expect(result.html).toBe(html);
      expect(result.plainText).toBe('Hello world! This is a test.');
      expect(result.wordCount).toBe(6);
      expect(result.characterCount).toBe(28);
    });

    it('deserializeFromJson should extract HTML from JSON', () => {
      const data = { html: '<p>Test content</p>' };
      expect(deserializeFromJson(data)).toBe('<p>Test content</p>');
    });

    it('deserializeFromJson should handle empty data', () => {
      const data = {};
      expect(deserializeFromJson(data as any)).toBe('');
    });
  });
});
