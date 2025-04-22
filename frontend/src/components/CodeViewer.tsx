import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code: string;
  language: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, language }) => {
  return (
    <div className="border rounded-lg" style={{ height: '400px' }}>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on'
        }}
      />
    </div>
  );
};

export default CodeViewer;