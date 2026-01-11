'use client';

interface CanvasEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export function CanvasEditor({ content, onContentChange }: CanvasEditorProps) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Canvas Editor</h3>
      <textarea 
        value={content} 
        onChange={(e) => onContentChange(e.target.value)}
        style={{ width: '100%', height: '300px', fontFamily: 'monospace' }}
        placeholder="Canvas content..."
      />
    </div>
  );
}
