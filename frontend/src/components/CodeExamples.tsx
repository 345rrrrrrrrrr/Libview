import React, { useState } from 'react';
import CodeViewer from './CodeViewer';

export interface CodeExample {
  title: string;
  code: string;
  language: string;
  source: string;
  url: string;
}

interface CodeExamplesProps {
  examples: CodeExample[];
  isLoading: boolean;
}

const CodeExamples: React.FC<CodeExamplesProps> = ({ examples, isLoading }) => {
  const [activeExampleIndex, setActiveExampleIndex] = useState<number | null>(examples.length > 0 ? 0 : null);
  const [filter, setFilter] = useState<string>('all');

  const filteredExamples = examples.filter(example => {
    if (filter === 'all') return true;
    return example.source.toLowerCase().includes(filter.toLowerCase());
  });

  // Group examples by source
  const sourceGroups = examples.reduce<Record<string, number>>((acc, example) => {
    const source = example.source;
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="text-xl font-bold">Code Examples</h2>
        <p className="text-sm text-gray-600 mt-1">
          Learn how to use this library with real-world code examples
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading examples...</p>
        </div>
      ) : examples.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
          {/* Left sidebar - Example list */}
          <div className="col-span-1 overflow-y-auto border-r" style={{ maxHeight: '600px' }}>
            {/* Filter buttons */}
            <div className="p-3 bg-gray-50 border-b flex items-center overflow-x-auto">
              <button
                className={`px-3 py-1 text-sm rounded-full mr-2 whitespace-nowrap ${
                  filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setFilter('all')}
              >
                All ({examples.length})
              </button>
              {Object.entries(sourceGroups).map(([source, count]) => (
                <button
                  key={source}
                  className={`px-3 py-1 text-sm rounded-full mr-2 whitespace-nowrap ${
                    filter === source ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setFilter(source)}
                >
                  {source} ({count})
                </button>
              ))}
            </div>

            {/* Examples list */}
            <ul className="divide-y divide-gray-200">
              {filteredExamples.map((example, index) => (
                <li key={index}>
                  <button
                    className={`w-full text-left p-4 hover:bg-blue-50 ${
                      activeExampleIndex === index ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setActiveExampleIndex(index)}
                  >
                    <h3 className="font-medium text-gray-900 truncate">{example.title}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {example.source}
                      </span>
                      {example.url && (
                        <a
                          href={example.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source Link
                        </a>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right panel - Code viewer */}
          <div className="col-span-2 p-4">
            {activeExampleIndex !== null && filteredExamples[activeExampleIndex] ? (
              <div>
                <h3 className="text-lg font-medium mb-2">{filteredExamples[activeExampleIndex].title}</h3>
                <CodeViewer 
                  code={filteredExamples[activeExampleIndex].code}
                  language={filteredExamples[activeExampleIndex].language}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
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
                <p>Select an example to view its code</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <p>No examples found for this library.</p>
          <p className="text-sm mt-2">Try checking the library's documentation for usage examples.</p>
        </div>
      )}
    </div>
  );
};

export default CodeExamples;