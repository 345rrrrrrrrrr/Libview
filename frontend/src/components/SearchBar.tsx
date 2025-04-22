import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string, searchType: 'local' | 'pypi') => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'local' | 'pypi'>('local');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, searchType);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setSearchType('local')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              searchType === 'local'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-200`}
          >
            Installed Libraries
          </button>
          <button
            type="button"
            onClick={() => setSearchType('pypi')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              searchType === 'pypi'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-l-0 border-gray-200`}
          >
            PyPI (All Libraries)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center max-w-lg mx-auto">
        <div className="relative w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder={`Search ${searchType === 'local' ? 'installed' : 'all'} Python libraries...`}
            required
          />
        </div>
        <button
          type="submit"
          className="p-2.5 ml-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300"
        >
          <svg
            className="w-4 h-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
          <span className="sr-only">Search</span>
        </button>
      </form>
      <div className="text-center mt-2 text-sm text-gray-500">
        {searchType === 'local'
          ? 'Searching locally installed Python libraries only'
          : 'Searching all 300,000+ Python packages on PyPI!'}
      </div>
    </div>
  );
};

export default SearchBar;