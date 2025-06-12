function getAPIData() {
  try {
    // API configuration
    var apiKey = "YOUR_API_KEY";
    var endpoint = "employees"; // Can be changed to "departments", etc.
    var url = 'https://api.rippling.com/platform/api/' + endpoint;
    
    // Request options
    var options = {
      "headers": {
        "Authorization": "Bearer " + apiKey
      },
      "method": "GET",
      "muteHttpExceptions": true // Better error handling
    };
    
    // Make API call
    var response = UrlFetchApp.fetch(url, options);
    
    // Check if API call was successful
    if (response.getResponseCode() !== 200) {
      throw new Error("API Error: " + response.getContentText());
    }
    
    // Parse JSON response
    var json = JSON.parse(response.getContentText());
    console.log('Full API response:', JSON.stringify(json, null, 2));
    
    // Validate response is an array
    if (!Array.isArray(json)) {
      throw new Error("Response is not an array. Received format: " + JSON.stringify(json));
    }
    
    // Handle empty response
    if (json.length === 0) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      sheet.clear();
      sheet.getRange(1, 1).setValue("No employees found");
      return;
    }
    
    // Process headers to include nested object fields
    var headers = [];
    var sampleItem = json[0];
    
    // Function to recursively collect all field paths
    function collectFieldPaths(obj, prefix) {
      var fieldPaths = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          var fullPath = prefix ? prefix + '.' + key : key;
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            // Recursively process nested objects
            fieldPaths = fieldPaths.concat(collectFieldPaths(obj[key], fullPath));
          } else {
            // Add the field path
            fieldPaths.push(fullPath);
          }
        }
      }
      return fieldPaths;
    }
    
    // Get all field paths (including nested ones)
    headers = collectFieldPaths(sampleItem, '');
    console.log('All field paths:', headers);
    
    // Function to get value from nested path
    function getNestedValue(obj, path) {
      return path.split('.').reduce(function(o, k) {
        return (o && o[k] !== undefined) ? o[k] : null;
      }, obj);
    }
    
    // Convert JSON to 2D array with flattened structure
    var data = json.map(item => {
      return headers.map(path => {
        var value = getNestedValue(item, path);
        
        // Handle array values by converting to string
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        // Handle object values (shouldn't happen with our field paths)
        else if (value && typeof value === 'object') {
          return JSON.stringify(value);
        }
        // Handle all other values
        return value !== undefined && value !== null ? value : '';
      });
    });
    
    // Clear sheet and write new data
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clear();
    
    // Write headers (replace dots with underscores for better readability)
    var displayHeaders = headers.map(h => h.replace(/\./g, '_'));
    sheet.getRange(1, 1, 1, displayHeaders.length).setValues([displayHeaders]);
    
    // Write data
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    
    console.log("Data updated successfully with flattened structure");
    
  } catch (error) {
    // Error handling
    console.error("Error:", error.message);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clear();
    sheet.getRange(1, 1).setValue("Error: " + error.message);
  }
}