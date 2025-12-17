from flask import Flask, jsonify, render_template
import csv
import os


# Serve static files from the current directory at the web root
app = Flask(__name__, static_folder='.', static_url_path='')


@app.route('/')
def index():
	return app.send_static_file('index.html')
    
# --- ADD THIS NEW BLOCK ---
@app.route('/api/data')
def get_data():
    data = []
    # Ensure the path is correct relative to app.py
    csv_path = os.path.join('datasets', 'data.csv') 
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # DictReader automatically uses the header row as keys
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        # Returns the data as a JSON list of objects
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# --------------------------

if __name__ == '__main__':
	port = int(os.environ.get('PORT', 8000))
	app.run(host='0.0.0.0', port=port, debug=True)
