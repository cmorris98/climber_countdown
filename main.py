
import logging

from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route('/api/blah')
def time():
    logging.info('time: ')
    current_time = datetime.now()
    logging.info('time: ' + str(current_time))
    return jsonify({'time': str(current_time)})

@app.errorhandler(500)
def server_error(e):
    # Log the error and stacktrace.
    logging.exception('An error occurred during a request.')
    return 'An internal error occurred.', 500
