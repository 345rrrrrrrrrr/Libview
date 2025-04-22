import React, { useState, useEffect } from 'react';
import { PyPIDetailedPackageInfo, PyPIReleaseInfo, getPackageInfoFromPyPI, installPackage } from '../services/api';

interface PyPIPackageDetailsProps {
  packageName: string;
  onClose: () => void;
}

const PyPIPackageDetails: React.FC<PyPIPackageDetailsProps> = ({ packageName, onClose }) => {
  const [packageInfo, setPackageInfo] = useState<PyPIDetailedPackageInfo | null>(null);
  const [releases, setReleases] = useState<PyPIReleaseInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackageInfo = async () => {
      try {
        setLoading(true);
        const response = await getPackageInfoFromPyPI(packageName);
        setPackageInfo(response.info);
        setReleases(response.releases);
        setError(null);
      } catch (err) {
        setError('Failed to load package information');
        console.error('Error fetching PyPI package info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageInfo();
  }, [packageName]);

  const handleInstall = async () => {
    try {
      const result = await installPackage(packageName);
      setInstallMessage(result.message);
    } catch (err) {
      setError('Failed to install package');
      console.error('Error installing package:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded shadow-lg max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Loading package information...</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded shadow-lg max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-red-600">{error}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{packageInfo?.name}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
          &times;
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            v{packageInfo?.version}
          </span>
          {packageInfo?.installed && (
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              Installed
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-2">{packageInfo?.summary}</p>
      </div>

      {!packageInfo?.installed && (
        <div className="mb-6">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Install Package
          </button>
          {installMessage && (
            <div className="mt-2 p-3 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap text-sm">{installMessage}</pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Package Details</h3>
          <table className="min-w-full">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium">Author</td>
                <td className="py-2">{packageInfo?.author || 'Unknown'}</td>
              </tr>
              {packageInfo?.author_email && (
                <tr className="border-b">
                  <td className="py-2 font-medium">Author Email</td>
                  <td className="py-2">{packageInfo.author_email}</td>
                </tr>
              )}
              {packageInfo?.license && (
                <tr className="border-b">
                  <td className="py-2 font-medium">License</td>
                  <td className="py-2">{packageInfo.license}</td>
                </tr>
              )}
              {packageInfo?.requires_python && (
                <tr className="border-b">
                  <td className="py-2 font-medium">Requires Python</td>
                  <td className="py-2">{packageInfo.requires_python}</td>
                </tr>
              )}
              {packageInfo?.home_page && (
                <tr className="border-b">
                  <td className="py-2 font-medium">Home Page</td>
                  <td className="py-2">
                    <a 
                      href={packageInfo.home_page} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {packageInfo.home_page}
                    </a>
                  </td>
                </tr>
              )}
              <tr className="border-b">
                <td className="py-2 font-medium">PyPI Page</td>
                <td className="py-2">
                  <a 
                    href={packageInfo?.project_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on PyPI
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Recent Releases</h3>
          {releases.length > 0 ? (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-4 text-left">Version</th>
                  <th className="py-2 px-4 text-left">Release Date</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-4">{release.version}</td>
                    <td className="py-2 px-4">
                      {release.upload_date ? new Date(release.upload_date).toLocaleDateString() : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No release information available.</p>
          )}
        </div>
      </div>

      {packageInfo?.description && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
            <div 
              className="prose prose-sm" 
              dangerouslySetInnerHTML={{ __html: packageInfo.description }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PyPIPackageDetails;