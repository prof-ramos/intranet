import { describe, it, expect } from 'vitest';
import {
  passwordResetEmailHtml,
  passwordResetEmailText,
  temporaryPasswordEmailHtml,
  temporaryPasswordEmailText,
} from './templates';

describe('passwordResetEmailHtml', () => {
  it('contains the reset link in the output', () => {
    const html = passwordResetEmailHtml('Maria', 'https://example.com/reset?token=abc123');
    expect(html).toContain('https://example.com/reset?token=abc123');
  });

  it('contains basic HTML structure', () => {
    const html = passwordResetEmailHtml('Maria', 'https://example.com/reset');
    expect(html).toContain('<html');
    expect(html).toContain('<body');
  });

  it('contains the recipient name', () => {
    const html = passwordResetEmailHtml('João da Silva', 'https://example.com/reset');
    expect(html).toContain('João da Silva');
  });

  it('escapes < and > in the reset link', () => {
    // A link containing angle brackets would be injected into an href attribute;
    // the escapeHtml helper converts < to &lt; and > to &gt;
    const html = passwordResetEmailHtml('Maria', 'https://example.com/?a=<b>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('escapes & in the reset link', () => {
    const html = passwordResetEmailHtml('Maria', 'https://example.com/?a=1&b=2');
    expect(html).not.toContain('?a=1&b=2');
    expect(html).toContain('?a=1&amp;b=2');
  });

  it('escapes " in the reset link', () => {
    const html = passwordResetEmailHtml('Maria', 'https://example.com/?q="test"');
    expect(html).not.toContain('"test"');
    expect(html).toContain('&quot;test&quot;');
  });

  it('escapes < and > in the recipient name', () => {
    const html = passwordResetEmailHtml('<script>alert(1)</script>', 'https://example.com/reset');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('passwordResetEmailText', () => {
  it('contains the reset link in plain text', () => {
    const text = passwordResetEmailText('Maria', 'https://example.com/reset?token=abc123');
    expect(text).toContain('https://example.com/reset?token=abc123');
  });

  it('contains the recipient name', () => {
    const text = passwordResetEmailText('João', 'https://example.com/reset');
    expect(text).toContain('João');
  });

  // Plain-text variant does NOT escape HTML — it is raw text, not HTML rendered in a browser.
  // This is intentional: the text body is never parsed as HTML.
  it('does not HTML-escape special characters (raw plain text)', () => {
    const text = passwordResetEmailText('Maria', 'https://example.com/?a=1&b=2');
    expect(text).toContain('?a=1&b=2');
  });
});

describe('temporaryPasswordEmailHtml', () => {
  it('contains the temporary password in the output', () => {
    const html = temporaryPasswordEmailHtml('Carlos', 'S3cur3P@ss!');
    expect(html).toContain('S3cur3P@ss!');
  });

  it('contains basic HTML structure', () => {
    const html = temporaryPasswordEmailHtml('Carlos', 'S3cur3P@ss!');
    expect(html).toContain('<html');
    expect(html).toContain('<body');
  });

  it('escapes < in the temporary password', () => {
    const html = temporaryPasswordEmailHtml('Carlos', '<injected>');
    expect(html).not.toContain('<injected>');
    expect(html).toContain('&lt;injected&gt;');
  });

  it('escapes the recipient name', () => {
    const html = temporaryPasswordEmailHtml('<b>Admin</b>', 'pass');
    expect(html).not.toContain('<b>Admin</b>');
    expect(html).toContain('&lt;b&gt;Admin&lt;/b&gt;');
  });
});

describe('temporaryPasswordEmailText', () => {
  it('contains the temporary password in plain text', () => {
    const text = temporaryPasswordEmailText('Carlos', 'S3cur3P@ss!');
    expect(text).toContain('S3cur3P@ss!');
  });

  it('contains the recipient name', () => {
    const text = temporaryPasswordEmailText('Carlos', 'S3cur3P@ss!');
    expect(text).toContain('Carlos');
  });
});
