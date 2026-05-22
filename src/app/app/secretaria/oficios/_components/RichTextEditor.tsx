'use client';

import { EditorContent, type Editor, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import type { ComponentType } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { useEffect } from 'react';
import { focusRingClass, hairline, navy, textMuted } from '@/lib/ui/tokens';

interface RichTextEditorValue {
  html: string;
  text: string;
}

interface RichTextEditorProps {
  valueHtml: string;
  onChange: (value: RichTextEditorValue) => void;
  error?: string;
}

interface ToolbarButtonProps {
  label: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const fontSizes = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
];

function getEditorText(editor: Editor) {
  return editor.getText({ blockSeparator: '\n' }).trim();
}

function ToolbarButton({ label, icon: Icon, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRingClass}`}
      style={{
        borderColor: active ? navy : hairline,
        backgroundColor: active ? navy : '#fff',
        color: active ? '#fff' : textMuted,
      }}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

export function RichTextEditor({ valueHtml, onChange, error }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: valueHtml || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] w-full rounded-b-lg px-4 py-3 text-sm leading-relaxed outline-none prose prose-sm max-w-none focus:outline-none',
        'aria-label': 'Corpo do ofício',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        html: currentEditor.getHTML(),
        text: getEditorText(currentEditor),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const nextHtml = valueHtml || '<p></p>';
    if (currentHtml !== nextHtml) {
      editor.commands.setContent(nextHtml, { emitUpdate: false });
    }
  }, [editor, valueHtml]);

  const disabled = !editor;

  return (
    <div>
      <div
        className="overflow-hidden rounded-lg border bg-white"
        style={{ borderColor: error ? '#dc2626' : hairline }}
      >
        <div
          className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
          style={{ borderColor: hairline, backgroundColor: '#f8fafc' }}
        >
          <ToolbarButton
            label="Negrito"
            icon={Bold}
            active={editor?.isActive('bold') ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Itálico"
            icon={Italic}
            active={editor?.isActive('italic') ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Lista não ordenada"
            icon={List}
            active={editor?.isActive('bulletList') ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Lista ordenada"
            icon={ListOrdered}
            active={editor?.isActive('orderedList') ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <div className="mx-1 h-6 w-px" style={{ backgroundColor: hairline }} />
          <ToolbarButton
            label="Alinhar à esquerda"
            icon={AlignLeft}
            active={editor?.isActive({ textAlign: 'left' }) ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          />
          <ToolbarButton
            label="Centralizar"
            icon={AlignCenter}
            active={editor?.isActive({ textAlign: 'center' }) ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          />
          <ToolbarButton
            label="Alinhar à direita"
            icon={AlignRight}
            active={editor?.isActive({ textAlign: 'right' }) ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          />
          <label
            className="ml-1 inline-flex items-center gap-2 text-xs font-semibold"
            style={{ color: textMuted }}
          >
            Tamanho
            <select
              disabled={disabled}
              aria-label="Tamanho da fonte"
              className={`h-9 rounded-md border bg-white px-2 text-xs ${focusRingClass}`}
              style={{ borderColor: hairline, color: textMuted }}
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;
                if (!editor) return;
                if (value) {
                  editor.chain().focus().setFontSize(value).run();
                } else {
                  editor.chain().focus().unsetFontSize().run();
                }
              }}
            >
              <option value="">Padrão</option>
              {fontSizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
