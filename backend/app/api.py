from flask import Blueprint, jsonify, request
import importlib
import inspect
import pkgutil
import sys
import importlib.metadata
import re
import requests
from concurrent.futures import ThreadPoolExecutor

api_bp = Blueprint('api', __name__)

# PyPI API endpoints
PYPI_SEARCH_URL = "https://pypi.org/pypi"
PYPI_SEARCH_ENDPOINT = "https://pypi.org/search/"
PYPI_PROJECT_URL = "https://pypi.org/pypi/{package_name}/json"

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
        except:
            pass
            
        # PyPI uses a JSON API for searching
        search_url = f"https://pypi.org/pypi/simple"
        
        # To search PyPI efficiently, we'll use their JSON API
        params = {
            "q": query,
            "page": page
        }
        
        # Direct search might not work well with the simple API, so we'll try the advanced search
        # This requires HTML parsing, but there's also a JSON endpoint we can try
        try:
            json_search_url = f"https://pypi.org/search/api/?q={query}&page={page}"
            response = requests.get(json_search_url, timeout=5)
            data = response.json()
            
            results = []
            for item in data.get('results', []):
                package_info = {
                    "name": item.get('name', ''),
                    "version": item.get('version', ''),
                    "summary": item.get('description', 'No description available'),
                    "installed": item.get('name', '').lower() in installed_packages,
                    "pypi_url": f"https://pypi.org/project/{item.get('name', '')}"
                }
                results.append(package_info)
                
            return jsonify({
                "status": "success", 
                "packages": results[:per_page],
                "total": data.get('total', 0),
                "page": page,
                "pages": (data.get('total', 0) + per_page - 1) // per_page
            })
            
        except:
            # Fallback to a different approach - get package details directly
            # This is less efficient but more reliable
            project_url = f"https://pypi.org/simple/"
            response = requests.get(project_url, timeout=10)
            
            # Parse basic HTML to get package names
            import re
            package_names = re.findall(r'<a[^>]*>([^<]+)</a>', response.text)
            
            # Filter packages by query
            matching_packages = [name for name in package_names if query in name.lower()]
            
            # Paginate results
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_packages = matching_packages[start_idx:end_idx]
            
            # For each package, try to get more details
            results = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                def get_package_details(name):
                    try:
                        detail_url = PYPI_PROJECT_URL.format(package_name=name)
                        detail_response = requests.get(detail_url, timeout=3)
                        if detail_response.status_code == 200:
                            data = detail_response.json()
                            info = data.get('info', {})
                            return {
                                "name": name,
                                "version": info.get('version', 'Unknown'),
                                "summary": info.get('summary', 'No description available'),
                                "installed": name.lower() in installed_packages,
                                "pypi_url": f"https://pypi.org/project/{name}"
                            }
                    except:
                        pass
                    
                    # Fallback if we couldn't get details
                    return {
                        "name": name,
                        "version": "Unknown",
                        "summary": "No description available",
                        "installed": name.lower() in installed_packages,
                        "pypi_url": f"https://pypi.org/project/{name}"
                    }
                
                # Get package details in parallel for better performance
                package_futures = [executor.submit(get_package_details, name) for name in paginated_packages]
                for future in package_futures:
                    package_info = future.result()
                    if package_info:
                        results.append(package_info)
            
            return jsonify({
                "status": "success",
                "packages": results,
                "total": len(matching_packages),
                "page": page,
                "pages": (len(matching_packages) + per_page - 1) // per_page
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error searching PyPI: {str(e)}"
        }), 500

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