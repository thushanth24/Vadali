import React, { useEffect, useRef } from 'react';

// This is necessary because Quill is loaded from a CDN and attaches to the window object.
declare var Quill: any;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current && !quillInstanceRef.current) {
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: placeholder || 'Start writing your amazing article...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
          ],
        },
      });

      quillInstanceRef.current = quill;

      if (value) {
        quill.root.innerHTML = value;
      }

      quill.on('text-change', () => {
        const editorContent = quill.root.innerHTML;
        if (editorContent === '<p><br></p>') {
            onChange('');
        } else {
            onChange(editorContent);
        }
      });
    }
  }, [placeholder]);
  
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill && quill.root.innerHTML !== value) {
        if (value === '') {
            quill.setText('');
        } else {
            const delta = quill.clipboard.convert(value);
            quill.setContents(delta, 'silent');
        }
    }
  }, [value]);

  return <div ref={editorRef} style={{ height: '400px', backgroundColor: 'white' }} />;
};

export default RichTextEditor;
