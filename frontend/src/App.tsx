import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import LibraryDetails from './components/LibraryDetails';
import { 
  searchLibraries, 
  getLibraryInfo, 
  getSourceCode, 
  LibraryInfo, 
  PackageInfo 
} from './services/api';
import './App.css';

function App() {
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [libraryInfo, setLibraryInfo] = useState<LibraryInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const response = await searchLibraries(query);
      setSearchResults(response.packages);
    } catch (err: any) {
      setError('Error searching for libraries: ' + (err.message || 'Unknown error'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLibrary = async (libraryName: string) => {
    setSelectedLibrary(libraryName);
    setLibraryInfo(null);
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await getLibraryInfo(libraryName);
      setLibraryInfo(info);
    } catch (err: any) {
      setError('Error fetching library details: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSourceCode = async (
    elementType: 'class' | 'function' | 'method',
    elementName: string, 
    parentClass?: string
  ) => {
    if (!selectedLibrary) return '';
    
    try {
      const response = await getSourceCode(
        selectedLibrary,
        elementType,
        elementName,
        parentClass
      );
      return response.source_code;
    } catch (err) {
      return 'Error loading source code';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 shadow-md">
        <div className="container px-4 py-6 mx-auto">
          <h1 className="text-2xl font-bold text-white">Python Library Explorer</h1>
        </div>
      </header>
      
      <main className="container px-4 py-8 mx-auto">
        <div className="flex justify-center mb-8">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {error && (
          <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !selectedLibrary && (
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-xl font-semibold">Search Results</h2>
            <div className="divide-y">
              {searchResults.map((pkg) => (
                <div key={pkg.name} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-blue-600">{pkg.name}</h3>
                      <p className="text-sm text-gray-500">
                        {pkg.version && `v${pkg.version} • `}
                        {pkg.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectLibrary(pkg.name)}
                      className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      Explore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Library Details */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
            <p className="ml-3 text-lg font-medium text-gray-700">
              Loading library information...
            </p>
          </div>
        )}

        {libraryInfo && (
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setSelectedLibrary(null);
                  setLibraryInfo(null);
                }}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  ></path>
                </svg>
                Back to Search Results
              </button>
            </div>
            <LibraryDetails
              libraryInfo={libraryInfo}
              onViewSourceCode={handleViewSourceCode}
            />
          </>
        )}

        {/* Empty State */}
        {!isSearching && searchResults.length === 0 && !selectedLibrary && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <h2 className="mb-1 text-xl font-medium">Search for Python Libraries</h2>
            <p className="max-w-md">
              Enter a Python library name to explore its classes, functions, and documentation.
            </p>
          </div>
        )}
      </main>

      <footer className="py-6 bg-gray-800">
        <div className="container px-4 mx-auto">
          <p className="text-center text-gray-400">
            Python Library Explorer WebApp © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
