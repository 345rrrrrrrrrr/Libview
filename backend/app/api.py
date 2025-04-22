from flask import Blueprint, jsonify, request
import importlib
import inspect
import pkgutil
import sys
import importlib.metadata
import re
import requests
from concurrent.futures import ThreadPoolExecutor
import json
import os
import time
from pathlib import Path

# Additional imports for code examples functionality
import base64
import html
from urllib.parse import quote_plus
import markdown

api_bp = Blueprint('api', __name__)

# PyPI API endpoints
PYPI_SEARCH_URL = "https://pypi.org/pypi"
PYPI_SEARCH_ENDPOINT = "https://pypi.org/search/"
PYPI_PROJECT_URL = "https://pypi.org/pypi/{package_name}/json"

# Code examples sources
GITHUB_API_URL = "https://api.github.com/search/code"
STACK_OVERFLOW_API_URL = "https://api.stackexchange.com/2.3/search"
CODE_EXAMPLES_CACHE_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / "code_examples_cache"

# Create cache directory if it doesn't exist
if not CODE_EXAMPLES_CACHE_DIR.exists():
    CODE_EXAMPLES_CACHE_DIR.mkdir(parents=True)

def format_docstring(docstring):
    """
    Clean up and format docstrings, especially those using reStructuredText markup.
    """
    if not docstring:
        return "No documentation available"
    
    # Replace common reStructuredText directives and inline markup
    formatted = docstring
    
    # Replace code blocks with better formatting
    formatted = re.sub(r'.. code-block:: (\w+)\s*\n\n', r'\nCode example:\n\n', formatted)
    
    # Replace class, func, and other references
    formatted = re.sub(r':class:`~?([^`]+)`', r'\1', formatted)
    formatted = re.sub(r':func:`~?([^`]+)`', r'\1', formatted)
    formatted = re.sub(r':mimetype:`([^`]+)`', r'\1', formatted)
    formatted = re.sub(r':data:`([^`]+)`', r'\1', formatted)
    formatted = re.sub(r':ref:`([^`]+)`', r'\1', formatted)
    
    # Make version notes more readable
    formatted = re.sub(r'.. versionchanged:: (\S+)\s+', r'\n[Changed in version \1]: ', formatted)
    formatted = re.sub(r'.. versionadded:: (\S+)\s+', r'\n[Added in version \1]: ', formatted)
    formatted = re.sub(r'.. deprecated:: (\S+)\s+', r'\n[Deprecated in version \1]: ', formatted)
    
    # Clean up extra whitespace and newlines
    formatted = re.sub(r'\n{3,}', '\n\n', formatted)
    
    return formatted.strip()

@api_bp.route('/library/<string:library_name>', methods=['GET'])
def get_library_info(library_name):
    """Get information about a Python library."""
    try:
        # Normalize library name - convert to lowercase for case-insensitive matching
        # This helps with packages like 'Flask' that should be imported as 'flask'
        normalized_name = library_name.lower()
        
        # Try to import the module
        try:
            module = importlib.import_module(normalized_name)
        except ImportError:
            # If lowercase fails, try the original name (some packages are case-sensitive)
            module = importlib.import_module(library_name)
        
        # Get metadata
        try:
            metadata = {
                "name": library_name,
                "version": importlib.metadata.version(normalized_name),
                "summary": importlib.metadata.metadata(normalized_name).get('Summary', 'No description available')
            }
        except:
            try:
                # Try with original case if lowercase failed
                metadata = {
                    "name": library_name,
                    "version": importlib.metadata.version(library_name),
                    "summary": importlib.metadata.metadata(library_name).get('Summary', 'No description available')
                }
            except:
                metadata = {
                    "name": library_name,
                    "version": "Unknown",
                    "summary": "No description available"
                }
        
        # Get classes, functions and constants
        classes = []
        functions = []
        constants = []
        
        for name, obj in inspect.getmembers(module):
            # Skip private members
            if name.startswith('_'):
                continue
                
            # Get docstring and format it
            docstring = inspect.getdoc(obj) or "No documentation available"
            formatted_docstring = format_docstring(docstring)
            
            # Check if it's a class
            if inspect.isclass(obj):
                class_info = {
                    "name": name,
                    "docstring": formatted_docstring,
                    "methods": []
                }
                
                # Get methods for the class
                for method_name, method_obj in inspect.getmembers(obj, inspect.isfunction):
                    if not method_name.startswith('_'):
                        method_docstring = inspect.getdoc(method_obj) or "No documentation available"
                        method_formatted_docstring = format_docstring(method_docstring)
                        class_info["methods"].append({
                            "name": method_name,
                            "docstring": method_formatted_docstring
                        })
                        
                classes.append(class_info)
                
            # Check if it's a function
            elif inspect.isfunction(obj):
                func_info = {
                    "name": name,
                    "docstring": formatted_docstring
                }
                functions.append(func_info)
                
            # Otherwise, consider it a constant/variable
            else:
                try:
                    constant_info = {
                        "name": name,
                        "type": type(obj).__name__,
                        "value": str(obj) if len(str(obj)) < 1000 else str(obj)[:1000] + "..."
                    }
                    constants.append(constant_info)
                except:
                    pass
            
        return jsonify({
            "status": "success",
            "metadata": metadata,
            "classes": classes,
            "functions": functions,
            "constants": constants
        })
        
    except ImportError:
        return jsonify({
            "status": "error",
            "message": f"Library '{library_name}' not found or could not be imported."
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error accessing library information: {str(e)}"
        }), 500

@api_bp.route('/search', methods=['GET'])
def search_libraries():
    """Search for available Python libraries."""
    query = request.args.get('q', '').lower()
    
    # Get a list of installed packages
    packages = []
    try:
        for dist in importlib.metadata.distributions():
            name = dist.metadata['Name']
            if query in name.lower():
                packages.append({
                    "name": name,
                    "version": dist.version,
                    "summary": dist.metadata.get('Summary', 'No description available')
                })
    except:
        # Fallback to pkgutil if importlib.metadata isn't working
        for pkg in pkgutil.iter_modules():
            if query in pkg.name.lower():
                packages.append({
                    "name": pkg.name,
                    "version": "Unknown",
                    "summary": "No description available"
                })
    
    return jsonify({
        "status": "success",
        "packages": packages[:20]  # Limit to 20 results
    })

@api_bp.route('/library/<string:library_name>/source', methods=['GET'])
def get_source_code(library_name):
    """Get the source code of a specific element in a library."""
    element_type = request.args.get('type')  # 'class', 'function', or 'method'
    element_name = request.args.get('name')
    parent_class = request.args.get('parent')  # Only needed for methods
    
    if not element_name or not element_type:
        return jsonify({
            "status": "error",
            "message": "Missing parameters: 'type' and 'name' are required."
        }), 400
    
    try:
        # Normalize library name - convert to lowercase for case-insensitive matching
        normalized_name = library_name.lower()
        
        # Try to import the module with normalized name first
        try:
            module = importlib.import_module(normalized_name)
        except ImportError:
            # If lowercase fails, try the original name (some packages are case-sensitive)
            module = importlib.import_module(library_name)
        
        # Get the target object
        if element_type == 'class':
            target_obj = getattr(module, element_name)
        elif element_type == 'function':
            target_obj = getattr(module, element_name)
        elif element_type == 'method' and parent_class:
            class_obj = getattr(module, parent_class)
            target_obj = getattr(class_obj, element_name)
        else:
            return jsonify({
                "status": "error",
                "message": "Invalid element type or missing parent class for method."
            }), 400
        
        # Get detailed information about the object
        module_info = ""
        file_path = ""
        
        try:
            # Try to get the module's file path
            if hasattr(module, '__file__'):
                file_path = module.__file__
                module_info += f"Module file path: {file_path}\n\n"
        except Exception:
            pass
            
        # More detailed object information
        module_info += f"Object type: {type(target_obj).__name__}\n"
        
        if inspect.isbuiltin(target_obj):
            module_info += "This is a built-in function or method written in C.\n"
        
        # For classes, check if they're extension types
        if inspect.isclass(target_obj):
            if not hasattr(target_obj, '__module__') or target_obj.__module__ == 'builtins':
                module_info += "This is a built-in class written in C.\n"
            else:
                module_info += f"Class defined in module: {target_obj.__module__}\n"
                
        # Try to get the source code
        try:
            # Check if object has source code available
            if hasattr(target_obj, '__code__') or not inspect.isbuiltin(target_obj):
                source_code = inspect.getsource(target_obj)
            else:
                raise TypeError("No source code available")
                
        except (TypeError, OSError):
            # Provide more detailed error message with object information
            source_code = f"Source code not available (possibly built-in or binary extension)\n\n{module_info}"
            
            # Try to get docstring for additional context
            if inspect.getdoc(target_obj):
                # Format the docstring to clean up reStructuredText markup
                formatted_docstring = format_docstring(inspect.getdoc(target_obj))
                source_code += f"\nDocumentation:\n{formatted_docstring}"
                
            # For numpy arrays and similar objects, try to get representation
            if hasattr(target_obj, '__repr__'):
                try:
                    repr_str = repr(target_obj)
                    # Only add if it's reasonably sized
                    if len(repr_str) < 1000:
                        source_code += f"\n\nObject representation:\n{repr_str}"
                except:
                    pass
        
        return jsonify({
            "status": "success",
            "source_code": source_code
        })
        
    except ImportError:
        return jsonify({
            "status": "error",
            "message": f"Library '{library_name}' not found or could not be imported."
        }), 404
    except AttributeError:
        return jsonify({
            "status": "error",
            "message": f"Element '{element_name}' not found in library '{library_name}'."
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error accessing source code: {str(e)}"
        }), 500

@api_bp.route('/pypi/search', methods=['GET'])
def search_pypi():
    """Search for Python libraries in the PyPI repository."""
    query = request.args.get('q', '').lower()
    page = int(request.args.get('page', '1'))
    per_page = int(request.args.get('per_page', '20'))
    sort_by = request.args.get('sort_by', 'relevance')  # Options: relevance, popularity, name, date
    exact_match = request.args.get('exact_match', 'false').lower() == 'true'
    
    if not query:
        return jsonify({
            "status": "error",
            "message": "Search query is required"
        }), 400
    
    try:
        # Get the directly installed packages for comparison
        installed_packages = set()
        try:
            for dist in importlib.metadata.distributions():
                installed_packages.add(dist.metadata['Name'].lower())
        except Exception as e:
            print(f"Error getting installed packages: {str(e)}")
            
        results = []
        total_results = 0
        
        # First approach: Using the PyPI JSON API
        try:
            # Build the sort parameter if specified
            sort_param = ""
            if sort_by == "popularity":
                sort_param = "&o=-zscore"  # Use zscore for popularity
            elif sort_by == "name":
                sort_param = "&o=name"
            elif sort_by == "date":
                sort_param = "&o=-created"
                
            # Use PyPI's JSON search API
            json_search_url = f"https://pypi.org/pypi/{query}/json"
            
            # First try direct package lookup if it might be an exact match
            if len(query.split()) == 1:  # Only do direct lookup for single-word queries
                try:
                    direct_response = requests.get(json_search_url, timeout=5)
                    if direct_response.status_code == 200:
                        data = direct_response.json()
                        info = data.get('info', {})
                        
                        # Add the exact match package
                        package_info = {
                            "name": info.get('name', query),
                            "version": info.get('version', 'Unknown'),
                            "summary": info.get('summary', 'No description available'),
                            "installed": info.get('name', '').lower() in installed_packages,
                            "pypi_url": f"https://pypi.org/project/{info.get('name', query)}",
                            "relevance": 100,  # Highest relevance for exact match
                            "download_count": 0  # We don't have this info from direct lookup
                        }
                        results.append(package_info)
                except Exception as e:
                    print(f"Direct package lookup failed: {str(e)}")
            
            # Then do a more general search using the PyPI simple index
            try:
                # Parse the simple index to get a list of all packages
                simple_index_url = "https://pypi.org/simple/"
                simple_response = requests.get(simple_index_url, timeout=10)
                
                if simple_response.status_code == 200:
                    package_names = re.findall(r'<a[^>]*>([^<]+)</a>', simple_response.text)
                    
                    # Filter by search query
                    matching_packages = []
                    for name in package_names:
                        if query in name.lower():
                            # Skip if exact match is enabled and this isn't an exact match
                            if exact_match and name.lower() != query:
                                continue
                            matching_packages.append(name)
                    
                    # Calculate total after filtering
                    total_results = len(matching_packages)
                    
                    # Sort matching packages
                    if sort_by == "name":
                        matching_packages.sort()
                    
                    # Paginate the results
                    start_idx = (page - 1) * per_page
                    end_idx = min(start_idx + per_page, len(matching_packages))
                    paginated_packages = matching_packages[start_idx:end_idx]
                    
                    # Get details for each package
                    for name in paginated_packages:
                        # Skip if we already have this package from direct lookup
                        if any(p.get('name', '').lower() == name.lower() for p in results):
                            continue
                            
                        try:
                            # Try to get package details
                            package_url = f"https://pypi.org/pypi/{name}/json"
                            package_response = requests.get(package_url, timeout=3)
                            
                            if package_response.status_code == 200:
                                package_data = package_response.json()
                                info = package_data.get('info', {})
                                
                                # Calculate relevance score
                                relevance = 0
                                if query.lower() == name.lower():
                                    relevance = 100
                                elif query.lower() in name.lower():
                                    position = name.lower().find(query.lower())
                                    relevance = 90 - min(position, 80)
                                else:
                                    relevance = 50
                                
                                package_info = {
                                    "name": info.get('name', name),
                                    "version": info.get('version', 'Unknown'),
                                    "summary": info.get('summary', 'No description available'),
                                    "installed": info.get('name', '').lower() in installed_packages,
                                    "pypi_url": f"https://pypi.org/project/{info.get('name', name)}",
                                    "relevance": relevance,
                                    "download_count": 0  # We don't have this info
                                }
                                results.append(package_info)
                        except Exception as e:
                            print(f"Error getting details for {name}: {str(e)}")
                            # Still add a basic entry even if details fail
                            results.append({
                                "name": name,
                                "version": "Unknown",
                                "summary": "No description available",
                                "installed": name.lower() in installed_packages,
                                "pypi_url": f"https://pypi.org/project/{name}",
                                "relevance": 50,
                                "download_count": 0
                            })
            except Exception as e:
                print(f"Error using simple index: {str(e)}")
                
            # If we don't have any results yet, use a more direct approach
            if not results:
                # Fall back to searching with requests directly
                search_page_url = f"https://pypi.org/search/?q={query}&page={page}"
                response = requests.get(search_page_url, timeout=10)
                
                if response.status_code == 200:
                    # Extract package names from search results HTML
                    package_matches = re.findall(r'<span class="package-snippet__name">([^<]+)</span>', response.text)
                    version_matches = re.findall(r'<span class="package-snippet__version">([^<]+)</span>', response.text)
                    description_matches = re.findall(r'<p class="package-snippet__description">([^<]+)</p>', response.text)
                    
                    for i in range(min(len(package_matches), per_page)):
                        name = package_matches[i] if i < len(package_matches) else "Unknown"
                        version = version_matches[i] if i < len(version_matches) else "Unknown"
                        description = description_matches[i] if i < len(description_matches) else "No description available"
                        
                        # Skip if exact match is enabled and this isn't an exact match
                        if exact_match and name.lower() != query:
                            continue
                            
                        # Calculate relevance score
                        relevance = 0
                        if query.lower() == name.lower():
                            relevance = 100
                        elif query.lower() in name.lower():
                            position = name.lower().find(query.lower())
                            relevance = 90 - min(position, 80)
                        else:
                            relevance = 50
                            
                        package_info = {
                            "name": name,
                            "version": version,
                            "summary": description,
                            "installed": name.lower() in installed_packages,
                            "pypi_url": f"https://pypi.org/project/{name}",
                            "relevance": relevance,
                            "download_count": 0
                        }
                        
                        # Only add if we don't already have this package
                        if not any(p.get('name', '').lower() == name.lower() for p in results):
                            results.append(package_info)
        except Exception as e:
            print(f"Error using all PyPI search methods: {str(e)}")
            
        # Sort results based on the selected criteria
        if not results:
            # If all methods failed, create a dummy result to tell the user
            results = [{
                "name": f"Search for '{query}' failed",
                "version": "N/A",
                "summary": "There was an error accessing PyPI. Please try again or try a different search term.",
                "installed": False,
                "pypi_url": "https://pypi.org",
                "relevance": 0,
                "download_count": 0
            }]
        else:
            # Sort by the requested criteria
            if sort_by == "relevance":
                results.sort(key=lambda x: x["relevance"], reverse=True)
            elif sort_by == "popularity":
                results.sort(key=lambda x: x["download_count"], reverse=True)
            elif sort_by == "name":
                results.sort(key=lambda x: x["name"].lower())
                
        # Calculate total pages
        if total_results == 0:
            total_results = len(results)
            
        total_pages = (total_results + per_page - 1) // per_page
        
        return jsonify({
            "status": "success", 
            "packages": results,
            "total": total_results,
            "page": page,
            "pages": max(1, total_pages),
            "filters": {
                "sort_by": sort_by,
                "exact_match": exact_match
            }
        })
        
    except Exception as e:
        print(f"Unexpected error in search_pypi: {str(e)}")
        # Return a proper error response to prevent 500 error
        return jsonify({
            "status": "error",
            "message": f"Error searching PyPI: {str(e)}",
            "packages": [],
            "total": 0,
            "page": 1,
            "pages": 1,
            "filters": {
                "sort_by": sort_by,
                "exact_match": exact_match
            }
        })

@api_bp.route('/pypi/package/<string:package_name>', methods=['GET'])
def get_pypi_package_info(package_name):
    """Get detailed information about a package from PyPI."""
    try:
        # Try to get package information from PyPI
        url = PYPI_PROJECT_URL.format(package_name=package_name)
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            info = data.get('info', {})
            
            # Get installation status
            installed = False
            try:
                importlib.import_module(package_name.lower())
                installed = True
            except ImportError:
                try:
                    importlib.metadata.version(package_name)
                    installed = True
                except:
                    pass
            
            # Extract the most useful information
            package_info = {
                "name": info.get('name', package_name),
                "version": info.get('version', 'Unknown'),
                "summary": info.get('summary', 'No description available'),
                "description": info.get('description', ''),
                "author": info.get('author', 'Unknown'),
                "author_email": info.get('author_email', ''),
                "home_page": info.get('home_page', ''),
                "project_url": info.get('project_url', f"https://pypi.org/project/{package_name}"),
                "package_url": info.get('package_url', ''),
                "requires_python": info.get('requires_python', ''),
                "license": info.get('license', ''),
                "keywords": info.get('keywords', ''),
                "installed": installed,
                "install_command": f"pip install {package_name}"
            }
            
            # Get release information
            releases = data.get('releases', {})
            release_info = []
            
            for version, files in releases.items():
                if files:
                    release_date = files[0].get('upload_time', '')
                    release_info.append({
                        "version": version,
                        "upload_date": release_date
                    })
            
            # Sort by version (most recent first)
            release_info.sort(key=lambda x: x.get('version', ''), reverse=True)
            
            return jsonify({
                "status": "success",
                "info": package_info,
                "releases": release_info[:10]  # Limit to 10 most recent releases
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Package '{package_name}' not found on PyPI."
            }), 404
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error accessing PyPI: {str(e)}"
        }), 500

@api_bp.route('/library/<string:library_name>/examples', methods=['GET'])
def get_library_examples(library_name):
    """Get code examples for a Python library."""
    try:
        cache_file = CODE_EXAMPLES_CACHE_DIR / f"{library_name}_examples.json"
        
        # Check if we have cached examples
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    # Use cached data if it's not too old (less than 1 week)
                    if cached_data.get('timestamp', 0) > time.time() - (7 * 24 * 60 * 60):
                        return jsonify(cached_data)
            except Exception as e:
                print(f"Error reading cache: {e}")
        
        # Extract any docstring examples from the library itself
        docstring_examples = []
        try:
            # Try to import the module
            try:
                module = importlib.import_module(library_name.lower())
            except ImportError:
                module = importlib.import_module(library_name)
            
            # Look for code examples in module docstring
            if module.__doc__:
                code_blocks = extract_code_blocks(module.__doc__)
                for i, code in enumerate(code_blocks):
                    docstring_examples.append({
                        "title": f"{library_name} Documentation Example {i+1}",
                        "code": code,
                        "language": "python",
                        "source": "Library Documentation",
                        "url": ""
                    })
            
            # Look for examples in class and function docstrings
            for name, obj in inspect.getmembers(module):
                if name.startswith('_'):
                    continue
                    
                if inspect.isclass(obj) or inspect.isfunction(obj):
                    if obj.__doc__:
                        code_blocks = extract_code_blocks(obj.__doc__)
                        for i, code in enumerate(code_blocks):
                            docstring_examples.append({
                                "title": f"{name} Example {i+1}",
                                "code": code,
                                "language": "python",
                                "source": f"{library_name}.{name} Documentation",
                                "url": ""
                            })
        except Exception as e:
            print(f"Error extracting docstring examples: {e}")
        
        # Get examples from GitHub
        github_examples = []
        try:
            # Search for Python files that import and use the library
            query = f"import {library_name} language:python"
            headers = {}
            
            # Add GitHub token if available for higher rate limits
            github_token = os.environ.get('GITHUB_TOKEN')
            if github_token:
                headers["Authorization"] = f"token {github_token}"
                
            params = {
                "q": query,
                "sort": "stars",
                "per_page": 5
            }
            
            response = requests.get(GITHUB_API_URL, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('items', [])[:5]:  # Limit to 5 examples
                    try:
                        # Get the raw file content
                        content_url = item.get('url')
                        content_response = requests.get(content_url, headers=headers, timeout=5)
                        
                        if content_response.status_code == 200:
                            file_data = content_response.json()
                            content = file_data.get('content', '')
                            if content:
                                # Decode base64 content
                                file_content = base64.b64decode(content).decode('utf-8')
                                
                                # Extract the most relevant part (find sections using the library)
                                relevant_code = extract_relevant_code(file_content, library_name)
                                
                                if relevant_code:
                                    repo_name = item.get('repository', {}).get('full_name', 'Unknown Repo')
                                    file_path = item.get('path', 'Unknown File')
                                    
                                    github_examples.append({
                                        "title": f"{repo_name} - {file_path}",
                                        "code": relevant_code,
                                        "language": "python",
                                        "source": "GitHub",
                                        "url": item.get('html_url', '')
                                    })
                    except Exception as e:
                        print(f"Error fetching GitHub file: {e}")
        except Exception as e:
            print(f"Error fetching GitHub examples: {e}")
        
        # Get examples from Stack Overflow
        stackoverflow_examples = []
        try:
            # Search for Stack Overflow questions with accepted answers
            params = {
                "site": "stackoverflow",
                "tagged": library_name,
                "sort": "votes",
                "order": "desc",
                "filter": "withbody",  # Include the body with the answers
                "pagesize": 5
            }
            
            response = requests.get(f"{STACK_OVERFLOW_API_URL}/advanced", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('items', [])[:5]:
                    try:
                        title = item.get('title', '')
                        body = item.get('body', '')
                        
                        # Extract code blocks using regex
                        code_blocks = re.findall(r'<code>(.*?)</code>', body, re.DOTALL)
                        
                        for i, code in enumerate(code_blocks):
                            # Skip very short code snippets
                            if len(code) < 20:
                                continue
                                
                            # Unescape HTML entities
                            code = html.unescape(code)
                            
                            stackoverflow_examples.append({
                                "title": title,
                                "code": code,
                                "language": "python",
                                "source": "Stack Overflow",
                                "url": item.get('link', '')
                            })
                    except Exception as e:
                        print(f"Error processing Stack Overflow example: {e}")
        except Exception as e:
            print(f"Error fetching Stack Overflow examples: {e}")
        
        # Combine all examples
        all_examples = docstring_examples + github_examples + stackoverflow_examples
        
        # Ensure we have at least some examples even if API calls fail
        if not all_examples:
            all_examples = [{
                "title": "Basic Example",
                "code": f"import {library_name}\n\n# Basic usage example\n# For more examples, visit the library documentation",
                "language": "python",
                "source": "Generated",
                "url": ""
            }]
        
        # Save to cache
        result = {
            "status": "success",
            "library_name": library_name,
            "examples": all_examples,
            "timestamp": int(time.time())
        }
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(result, f)
        except Exception as e:
            print(f"Error saving cache: {e}")
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error getting examples: {str(e)}"
        }), 500

def extract_code_blocks(docstring):
    """Extract Python code blocks from docstrings."""
    if not docstring:
        return []
    
    # First, try to find explicit code blocks marked by indentation and >>> prompt
    examples = []
    
    # Look for reStructuredText code blocks
    blocks = re.findall(r'```python\s+(.*?)\s+```', docstring, re.DOTALL)
    examples.extend(blocks)
    
    # Look for code blocks with >>> prompts
    prompt_blocks = re.findall(r'>>> (.*?)(?=>>>|\Z)', docstring, re.DOTALL)
    for block in prompt_blocks:
        # Clean up the prompts
        lines = block.splitlines()
        code_lines = []
        for line in lines:
            if line.strip().startswith('>>>'):
                code_lines.append(line.strip()[4:])
            elif line.strip().startswith('...'):
                code_lines.append(line.strip()[4:])
            else:
                # Skip output lines
                continue
        if code_lines:
            examples.append('\n'.join(code_lines))
    
    # Look for indented code blocks
    indented_blocks = re.findall(r'(?:^|\n)( {4,}[^\n]+(?:\n {4,}[^\n]+)*)', docstring)
    for block in indented_blocks:
        # Remove common indentation
        lines = block.splitlines()
        if lines:
            common_indent = min(len(line) - len(line.lstrip()) for line in lines if line.strip())
            code = '\n'.join(line[common_indent:] for line in lines)
            # Only add if it looks like Python code
            if re.search(r'\bdef\b|\bclass\b|\bif\b|\bfor\b|\bimport\b|\bwith\b', code):
                examples.append(code)
    
    return examples

def extract_relevant_code(file_content, library_name):
    """Extract the most relevant code snippets from a file that uses the given library."""
    # Split the file into lines
    lines = file_content.splitlines()
    
    # Find import statements for the library
    import_patterns = [
        f"import {library_name}",
        f"from {library_name} import"
    ]
    
    import_lines = []
    for i, line in enumerate(lines):
        if any(pattern in line for pattern in import_patterns):
            import_lines.append(i)
    
    if not import_lines:
        # If no direct imports found, look for any usage of the library name
        for i, line in enumerate(lines):
            if f"{library_name}." in line:
                # Found possible usage
                import_lines.append(i)
    
    if not import_lines:
        # No imports found
        return None
    
    # Extract meaningful snippets around imports or usage
    relevant_snippets = []
    
    for import_line in import_lines:
        # Look for a function or class that uses the library
        start_line = max(0, import_line - 5)
        end_line = min(len(lines), import_line + 30)
        
        # Capture a reasonable chunk of code
        snippet = '\n'.join(lines[start_line:end_line])
        relevant_snippets.append(snippet)
    
    # Combine snippets, but limit total length
    combined = '\n\n'.join(relevant_snippets)
    if len(combined) > 2000:
        combined = combined[:2000] + "\n# ... (truncated) ..."
    
    return combined