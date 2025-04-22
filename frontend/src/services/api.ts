import axios from 'axios';

// Configure axios with proper settings for GitHub Codespaces
// Allow credentials (cookies) and configure CORS
const axiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Determine the API URL based on the environment
let API_URL = '/api';

// For GitHub Codespaces, we need to ensure proper port handling
// By using the window.location.hostname we maintain the proper domain
if (window.location.hostname.includes('github.dev')) {
  // Use the same hostname but change port from 3000 to 5000
  API_URL = window.location.protocol + '//' + 
            window.location.hostname.replace('-3001', '-5000') + 
            '/api';
}

// For local development, use the proxy set up in package.json
// For Vercel deployment, the API_URL will remain as /api since our routes in vercel.json will handle it

export interface LibraryMetadata {
  name: string;
  version: string;
  summary: string;
}

export interface Method {
  name: string;
  docstring: string;
}

export interface ClassInfo {
  name: string;
  docstring: string;
  methods: Method[];
}

export interface FunctionInfo {
  name: string;
  docstring: string;
}

export interface ConstantInfo {
  name: string;
  type: string;
  value: string;
}

export interface LibraryInfo {
  status: string;
  metadata: LibraryMetadata;
  classes: ClassInfo[];
  functions: FunctionInfo[];
  constants: ConstantInfo[];
}

export interface PackageInfo {
  name: string;
  version: string;
  summary: string;
}

export interface SearchResponse {
  status: string;
  packages: PackageInfo[];
}

export interface SourceCodeResponse {
  status: string;
  source_code: string;
}

export interface PyPIPackageInfo {
  name: string;
  version: string;
  summary: string;
  installed: boolean;
  pypi_url: string;
  relevance?: number;
  download_count?: number;
}

export interface PyPISearchResponse {
  status: string;
  packages: PyPIPackageInfo[];
  total: number;
  page: number;
  pages: number;
  filters?: {
    sort_by: string;
    exact_match: boolean;
  };
}

export interface PyPIReleaseInfo {
  version: string;
  upload_date: string;
}

export interface PyPIDetailedPackageInfo {
  name: string;
  version: string;
  summary: string;
  description: string;
  author: string;
  author_email: string;
  home_page: string;
  project_url: string;
  package_url: string;
  requires_python: string;
  license: string;
  keywords: string;
  installed: boolean;
  install_command: string;
}

export interface PyPIPackageDetailResponse {
  status: string;
  info: PyPIDetailedPackageInfo;
  releases: PyPIReleaseInfo[];
}

export interface PyPISearchOptions {
  query: string;
  page?: number;
  perPage?: number;
  sortBy?: 'relevance' | 'popularity' | 'name' | 'date';
  exactMatch?: boolean;
}

export interface CodeExample {
  title: string;
  code: string;
  language: string;
  source: string;
  url: string;
}

export interface CodeExamplesResponse {
  status: string;
  library_name: string;
  examples: CodeExample[];
}

export interface LibraryAssistantResponse {
  query: string;
  message: string;
  libraries: {
    name: string;
    version?: string;
    summary: string;
  }[];
}

export const searchLibraries = async (query: string): Promise<SearchResponse> => {
  try {
    console.log(`Sending request to: ${API_URL}/search with query: ${query}`);
    const response = await axiosInstance.get(`${API_URL}/search`, {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching libraries:', error);
    throw error;
  }
};

export const getLibraryInfo = async (libraryName: string): Promise<LibraryInfo> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/library/${libraryName}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting info for library ${libraryName}:`, error);
    throw error;
  }
};

export const getSourceCode = async (
  libraryName: string,
  elementType: 'class' | 'function' | 'method',
  elementName: string,
  parentClass?: string
): Promise<SourceCodeResponse> => {
  try {
    const params: Record<string, string> = {
      type: elementType,
      name: elementName
    };

    if (parentClass && elementType === 'method') {
      params.parent = parentClass;
    }

    const response = await axiosInstance.get(`${API_URL}/library/${libraryName}/source`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting source code for ${elementType} ${elementName}:`, error);
    throw error;
  }
};

export const searchPyPI = async (
  options: PyPISearchOptions
): Promise<PyPISearchResponse> => {
  try {
    const { query, page = 1, perPage = 20, sortBy = 'relevance', exactMatch = false } = options;
    
    console.log(`Searching PyPI for: ${query} (page ${page}, sort: ${sortBy}, exact: ${exactMatch})`);
    const response = await axiosInstance.get(`${API_URL}/pypi/search`, {
      params: { 
        q: query,
        page,
        per_page: perPage,
        sort_by: sortBy,
        exact_match: exactMatch
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching PyPI:', error);
    throw error;
  }
};

export const getPackageInfoFromPyPI = async (packageName: string): Promise<PyPIPackageDetailResponse> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/pypi/package/${packageName}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting PyPI info for package ${packageName}:`, error);
    throw error;
  }
};

export const installPackage = async (packageName: string): Promise<{success: boolean; message: string}> => {
  try {
    // For now, we'll just return instructions
    return {
      success: true,
      message: `To install ${packageName}, run: pip install ${packageName}`
    };
    
    // In the future, we could implement actual installation via an API endpoint:
    // const response = await axiosInstance.post(`${API_URL}/install-package`, { packageName });
    // return response.data;
  } catch (error) {
    console.error(`Error installing package ${packageName}:`, error);
    throw error;
  }
};

export const getLibraryExamples = async (libraryName: string): Promise<CodeExamplesResponse> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/library/${libraryName}/examples`);
    return response.data;
  } catch (error) {
    console.error(`Error getting examples for library ${libraryName}:`, error);
    throw error;
  }
};

/**
 * Search for libraries based on a natural language description using the AI assistant
 * @param query A natural language query about Python libraries
 * @returns Promise<LibraryAssistantResponse> Contains the original query, an AI message, and suggested libraries
 */
export const searchLibrariesByDescription = async (query: string): Promise<LibraryAssistantResponse> => {
  const response = await axiosInstance.post(`${API_URL}/assistant/query`, { query });
  return response.data;
};