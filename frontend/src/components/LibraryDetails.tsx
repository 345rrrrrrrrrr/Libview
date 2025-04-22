import React, { useState } from 'react';
import { LibraryInfo } from '../services/api';
import CodeViewer from './CodeViewer';

interface LibraryDetailsProps {
  libraryInfo: LibraryInfo;
  onViewSourceCode: (
    elementType: 'class' | 'function' | 'method',
    elementName: string,
    parentClass?: string
  ) => Promise<string>;
}

const LibraryDetails: React.FC<LibraryDetailsProps> = ({
  libraryInfo,
  onViewSourceCode,
}) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'functions' | 'constants'>('classes');
  const [selectedCode, setSelectedCode] = useState<{ code: string; name: string } | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  const handleViewCode = async (
    elementType: 'class' | 'function' | 'method',
    elementName: string,
    parentClass?: string
  ) => {
    setIsLoadingCode(true);
    try {
      const sourceCode = await onViewSourceCode(elementType, elementName, parentClass);
      setSelectedCode({ code: sourceCode, name: elementName });
    } catch (error) {
      console.error('Failed to load source code', error);
    } finally {
      setIsLoadingCode(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg">
      {/* Library Metadata */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">{libraryInfo.metadata.name}</h2>
        <div className="mt-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
            v{libraryInfo.metadata.version}
          </span>
        </div>
        <p className="mt-3 text-gray-600">{libraryInfo.metadata.summary}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'classes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('classes')}
        >
          Classes ({libraryInfo.classes.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'functions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('functions')}
        >
          Functions ({libraryInfo.functions.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'constants'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('constants')}
        >
          Constants ({libraryInfo.constants.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left panel: Library elements */}
        <div className="p-6 overflow-y-auto border-r" style={{ maxHeight: '500px' }}>
          {activeTab === 'classes' && (
            <div className="space-y-4">
              {libraryInfo.classes.map((classInfo) => (
                <div key={classInfo.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{classInfo.name}</h3>
                    <button
                      className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                      onClick={() => handleViewCode('class', classInfo.name)}
                    >
                      View Code
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{classInfo.docstring}</p>
                  {classInfo.methods.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700">Methods:</h4>
                      <ul className="mt-2 space-y-1">
                        {classInfo.methods.map((method) => (
                          <li key={method.name} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{method.name}()</span>
                            <button
                              className="px-2 py-0.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                              onClick={() => handleViewCode('method', method.name, classInfo.name)}
                            >
                              View
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {libraryInfo.classes.length === 0 && (
                <p className="text-gray-500">No classes found in this library.</p>
              )}
            </div>
          )}

          {activeTab === 'functions' && (
            <div className="space-y-4">
              {libraryInfo.functions.map((functionInfo) => (
                <div key={functionInfo.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{functionInfo.name}()</h3>
                    <button
                      className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                      onClick={() => handleViewCode('function', functionInfo.name)}
                    >
                      View Code
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{functionInfo.docstring}</p>
                </div>
              ))}
              {libraryInfo.functions.length === 0 && (
                <p className="text-gray-500">No functions found in this library.</p>
              )}
            </div>
          )}

          {activeTab === 'constants' && (
            <div className="space-y-4">
              {libraryInfo.constants.map((constantInfo) => (
                <div key={constantInfo.name} className="p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800">{constantInfo.name}</h3>
                  <div className="mt-1 text-xs text-gray-500">Type: {constantInfo.type}</div>
                  <pre className="p-2 mt-2 overflow-x-auto text-sm bg-gray-100 rounded">
                    {constantInfo.value}
                  </pre>
                </div>
              ))}
              {libraryInfo.constants.length === 0 && (
                <p className="text-gray-500">No constants found in this library.</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel: Code viewer */}
        <div className="p-6">
          {isLoadingCode ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : selectedCode ? (
            <div>
              <h3 className="mb-3 text-lg font-medium text-gray-800">Source: {selectedCode.name}</h3>
              <CodeViewer code={selectedCode.code} language="python" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                ></path>
              </svg>
              <p>Select a class, function, or method to view its source code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryDetails;