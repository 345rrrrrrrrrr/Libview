import axios from 'axios';

// Use a relative URL which will work in any environment
const API_URL = '/api';

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
    const response = await axios.get(`${API_URL}/search`, {
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
    const response = await axios.get(`${API_URL}/library/${libraryName}`);
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

    const response = await axios.get(`${API_URL}/library/${libraryName}/source`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting source code for ${elementType} ${elementName}:`, error);
    throw error;
  }
};