var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: './background.js',
    output: {
        filename: 'background.js',
        path: path.resolve(__dirname, './dist')
    }
}   