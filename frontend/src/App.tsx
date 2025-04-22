import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import LibraryDetails from './components/LibraryDetails';
import CodeViewer from './components/CodeViewer';
import PyPIPackageDetails from './components/PyPIPackageDetails';
import { 
  PackageInfo, 
  searchLibraries, 
  PyPIPackageInfo,
  searchPyPI
} from './services/api';

function App() {
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [pypiSearchResults, setPypiSearchResults] = useState<PyPIPackageInfo[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [selectedPyPIPackage, setSelectedPyPIPackage] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<{ code: string, element: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentSearchMode, setCurrentSearchMode] = useState<'local' | 'pypi'>('local');
  const [currentQuery, setCurrentQuery] = useState('');
  
  const handleSearch = async (query: string, searchType: 'local' | 'pypi') => {
    setLoading(true);
    setError(null);
    setSelectedLibrary(null);
    setSelectedPyPIPackage(null);
    setSourceCode(null);
    setCurrentSearchMode(searchType);
    setCurrentQuery(query);
    
    try {
      if (searchType === 'local') {
        const result = await searchLibraries(query);
        setSearchResults(result.packages);
        setPypiSearchResults([]);
      } else {
        const result = await searchPyPI(query, 1, 20);
        setPypiSearchResults(result.packages);
        setSearchResults([]);
        setCurrentPage(result.page);
        setTotalPages(result.pages);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search libraries. Please try again.');
      setSearchResults([]);
      setPypiSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMorePyPI = async () => {
    if (currentPage >= totalPages) return;
    
    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const result = await searchPyPI(currentQuery, nextPage, 20);
      setPypiSearchResults(prev => [...prev, ...result.packages]);
      setCurrentPage(result.page);
    } catch (err) {
      console.error('Error loading more results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLibrary = async (libraryName: string) => {
    setSelectedLibrary(libraryName);
    setSelectedPyPIPackage(null);
    setSourceCode(null);
  };

  const handleSelectPyPIPackage = (packageName: string) => {
    setSelectedPyPIPackage(packageName);
    setSelectedLibrary(null);
    setSourceCode(null);
  };

  const handleViewSourceCode = (code: string, element: string) => {
    setSourceCode({ code, element });
  };

  const handleBackToLibrary = () => {
    setSourceCode(null);
  };

  const handleBackToSearch = () => {
    setSelectedLibrary(null);
    setSelectedPyPIPackage(null);
    setSourceCode(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Libview</h1>
        <p className="text-gray-600">Explore Python Libraries and Packages</p>
      </header>

      <SearchBar onSearch={handleSearch} />

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {selectedLibrary && !sourceCode && (
        <LibraryDetails 
          libraryName={selectedLibrary} 
          onViewSourceCode={handleViewSourceCode}
          onBack={handleBackToSearch}
        />
      )}

      {selectedPyPIPackage && (
        <PyPIPackageDetails
          packageName={selectedPyPIPackage}
          onClose={handleBackToSearch}
        />
      )}

      {sourceCode && (
        <CodeViewer 
          code={sourceCode.code} 
          title={sourceCode.element}
          onBack={handleBackToLibrary}
        />
      )}

      {!loading && !selectedLibrary && !selectedPyPIPackage && !sourceCode && currentSearchMode === 'local' && searchResults.length > 0 && (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Installed Libraries</h2>
          <ul className="space-y-2">
            {searchResults.map((pkg, index) => (
              <li key={index} className="border-b pb-2">
                <button
                  onClick={() => handleSelectLibrary(pkg.name)}
                  className="text-left w-full hover:bg-gray-50 p-2 rounded"
                >
                  <div className="font-semibold text-blue-600">{pkg.name}</div>
                  <div className="text-sm text-gray-600">
                    {pkg.version && <span className="mr-2">v{pkg.version}</span>}
                    {pkg.summary}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !selectedLibrary && !selectedPyPIPackage && !sourceCode && currentSearchMode === 'pypi' && (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">PyPI Packages</h2>
          {pypiSearchResults.length > 0 ? (
            <>
              <ul className="space-y-2">
                {pypiSearchResults.map((pkg, index) => (
                  <li key={index} className="border-b pb-2">
                    <button
                      onClick={() => handleSelectPyPIPackage(pkg.name)}
                      className="text-left w-full hover:bg-gray-50 p-2 rounded"
                    >
                      <div className="flex justify-between">
                        <div className="font-semibold text-blue-600">{pkg.name}</div>
                        {pkg.installed && (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                            Installed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pkg.version && <span className="mr-2">v{pkg.version}</span>}
                        {pkg.summary}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              
              {currentPage < totalPages && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMorePyPI}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More Results'}
                  </button>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {pypiSearchResults.length} packages of {totalPages * 20}+ results
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-center py-10">
              No Python packages found matching your query. Try a different search term.
            </p>
          )}
        </div>
      )}

      {!loading && !selectedLibrary && !selectedPyPIPackage && !sourceCode && searchResults.length === 0 && pypiSearchResults.length === 0 && currentQuery !== '' && (
        <div className="bg-white p-6 rounded shadow text-center py-10">
          <p className="text-gray-600">
            No Python {currentSearchMode === 'local' ? 'libraries' : 'packages'} found matching your query. Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
