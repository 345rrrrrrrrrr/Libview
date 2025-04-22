import React from 'react';

export interface SearchFiltersProps {
  sortBy: string;
  exactMatch: boolean;
  onSortChange: (sortBy: string) => void;
  onExactMatchChange: (exactMatch: boolean) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  sortBy,
  exactMatch,
  onSortChange,
  onExactMatchChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
        <div>
          <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
            Sort by:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
          >
            <option value="relevance">Relevance</option>
            <option value="popularity">Popularity (Downloads)</option>
            <option value="name">Name (A-Z)</option>
            <option value="date">Release Date</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            id="exact-match"
            type="checkbox"
            checked={exactMatch}
            onChange={(e) => onExactMatchChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="exact-match" className="ml-2 text-sm font-medium text-gray-700">
            Exact name match only
          </label>
          <div className="ml-2 group relative">
            <span className="text-gray-400 cursor-help">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 w-48">
              Only show packages that exactly match your search term. 
              Helps find specific libraries like "tensorflow" without related packages.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;