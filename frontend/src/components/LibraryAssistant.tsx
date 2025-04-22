import React, { useState } from 'react';
import { searchLibrariesByDescription } from '../services/api';

interface Library {
  name: string;
  version?: string;
  summary: string;
}

interface AssistantResponse {
  query: string;
  message: string;
  libraries: Library[];
}

const LibraryAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<AssistantResponse[]>([]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await searchLibrariesByDescription(query);
      setConversation([...conversation, response]);
      setQuery('');
    } catch (error) {
      console.error('Error fetching library recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-xl font-bold mb-4">Library Assistant</h2>
      <div className="flex-grow overflow-auto mb-4 border border-gray-200 rounded p-3">
        {conversation.length === 0 ? (
          <div className="text-gray-500 italic text-center mt-8">
            <p>Ask me about Python libraries!</p>
            <p className="text-sm mt-2">Try questions like:</p>
            <ul className="text-sm mt-1">
              <li>"What are the Python libraries for developing AI?"</li>
              <li>"Which libraries help with user authentication?"</li>
              <li>"Show me data visualization libraries"</li>
            </ul>
          </div>
        ) : (
          conversation.map((item, index) => (
            <div key={index} className="mb-4">
              <div className="bg-blue-100 p-2 rounded-lg mb-2 inline-block">
                <p className="font-semibold">{item.query}</p>
              </div>
              <div className="mt-2">
                <p>{item.message}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {item.libraries.map((lib, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 hover:bg-gray-50">
                      <h3 className="font-bold">{lib.name}</h3>
                      <p className="text-sm text-gray-700">{lib.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about Python libraries..."
          className="flex-grow border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 disabled:bg-blue-300"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? 'Searching...' : 'Ask'}
        </button>
      </form>
    </div>
  );
};

export default LibraryAssistant;