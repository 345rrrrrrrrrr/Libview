from flask import Blueprint, jsonify, request
import importlib
import inspect
import pkgutil
import sys
import importlib.metadata

api_bp = Blueprint('api', __name__)

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
                
            # Get docstring
            docstring = inspect.getdoc(obj) or "No documentation available"
            
            # Check if it's a class
            if inspect.isclass(obj):
                class_info = {
                    "name": name,
                    "docstring": docstring,
                    "methods": []
                }
                
                # Get methods for the class
                for method_name, method_obj in inspect.getmembers(obj, inspect.isfunction):
                    if not method_name.startswith('_'):
                        method_docstring = inspect.getdoc(method_obj) or "No documentation available"
                        class_info["methods"].append({
                            "name": method_name,
                            "docstring": method_docstring
                        })
                        
                classes.append(class_info)
                
            # Check if it's a function
            elif inspect.isfunction(obj):
                func_info = {
                    "name": name,
                    "docstring": docstring
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
                source_code += f"\nDocumentation:\n{inspect.getdoc(target_obj)}"
                
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