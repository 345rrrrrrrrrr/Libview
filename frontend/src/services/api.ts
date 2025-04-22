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