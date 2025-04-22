import React, { useState, useEffect } from 'react';
import { LibraryInfo, getLibraryInfo, getSourceCode } from '../services/api';
import CodeViewer from './CodeViewer';

interface LibraryDetailsProps {
  libraryName: string;
  onViewSourceCode: (code: string, element: string) => void;
  onBack: () => void;
}

const LibraryDetails: React.FC<LibraryDetailsProps> = ({
  libraryName,
  onViewSourceCode,
  onBack
}) => {
  const [libraryInfo, setLibraryInfo] = useState<LibraryInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'classes' | 'functions' | 'constants'>('classes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibraryInfo = async () => {
      try {
        setLoading(true);
        const info = await getLibraryInfo(libraryName);
        setLibraryInfo(info);
        setError(null);
      } catch (err) {
        setError('Failed to load library information');
        console.error('Error fetching library info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryInfo();
  }, [libraryName]);

  const handleViewCode = async (
    elementType: 'class' | 'function' | 'method',
    elementName: string,
    parentClass?: string
  ) => {
    try {
      const result = await getSourceCode(libraryName, elementType, elementName, parentClass);
      onViewSourceCode(result.source_code, elementName);
    } catch (error) {
      console.error('Failed to load source code', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading library details...</p>
      </div>
    );
  }

  if (error || !libraryInfo) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {error || 'Unable to load library information'}
        <div className="mt-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg">
      {/* Library Metadata */}
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{libraryInfo.metadata.name}</h2>
          <div className="mt-2 flex items-center">
            <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              v{libraryInfo.metadata.version}
            </span>
          </div>
          <p className="mt-3 text-gray-600">{libraryInfo.metadata.summary}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back
        </button>
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
      <div className="p-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
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
    </div>
  );
};

export default LibraryDetails;