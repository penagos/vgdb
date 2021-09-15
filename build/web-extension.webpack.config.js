'use strict';

const path = require('path');

module.exports = {
	context: path.dirname(__dirname),
	mode: 'production',
	target: 'node',
	entry: {
		extension: './src/web/extension.ts',
	},
	resolve: {
		mainFields: ['module', 'main'],
		extensions: ['.ts', '.js'],
		alias: {
		}
	},
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					compilerOptions: {
						'sourceMap': true,
						'declaration': false
					}
				}
			}]
		}]
	},
	externals: {
		'vscode': 'commonjs vscode',
	},
	performance: {
		hints: false
	},
	output: {
		filename: 'extension.js',
		path: path.join(__dirname, '../dist/web'),
		libraryTarget: 'commonjs'
	},
	devtool: 'source-map'
};
