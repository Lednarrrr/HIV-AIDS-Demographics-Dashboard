from flask import Flask
import os

# Serve static files from the current directory at the web root
app = Flask(__name__, static_folder='.', static_url_path='')


@app.route('/')
def index():
	return app.send_static_file('index.html')


if __name__ == '__main__':
	port = int(os.environ.get('PORT', 8000))
	app.run(host='0.0.0.0', port=port, debug=True)
