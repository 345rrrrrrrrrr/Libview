import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code: string;
  title?: string;
  language?: string;
  onBack?: () => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ 
  code, 
  title, 
  language = 'python', 
  onBack 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {(title || onBack) && (
        <div className="bg-gray-50 border-b flex justify-between items-center p-4">
          {title && <h2 className="font-semibold text-lg">{title}</h2>}
          {onBack && (
            <button 
              onClick={onBack}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back
            </button>
          )}
        </div>
      )}
      
      <div style={{ height: '500px' }}>
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
    </div>
  );
};

export default CodeViewer;