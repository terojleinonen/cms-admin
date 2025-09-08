import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor, {
  getPlainText,
  truncateHtml,
  validateHtmlContent,
} from '@/components/editor/RichTextEditor';

jest.mock('react-quill', () => {
  const ReactQuill = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
    <textarea
      data-testid="react-quill"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  ReactQuill.displayName = 'ReactQuill';
  return ReactQuill;
});

jest.mock('dompurify', () => ({
  sanitize: (html: string) => html,
}));

import { act } from 'react';

describe('RichTextEditor', () => {
  it('should render the editor', async () => {
    await act(async () => {
      render(<RichTextEditor value="" onChange={() => {}} />);
    });
    expect(await screen.findByTestId('react-quill')).toBeInTheDocument();
  });

  it('should call onChange with sanitized content when the value changes', async () => {
    const handleChange = jest.fn();
    await act(async () => {
      render(<RichTextEditor value="" onChange={handleChange} />);
    });
    const editor = await screen.findByTestId('react-quill');
    await userEvent.type(editor, 'hello');
    expect(handleChange).toHaveBeenCalledTimes(5);
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
  });
});
