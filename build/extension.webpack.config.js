'use strict';

const path = require('path');

module.exports = {
	context: path.dirname(__dirname),
	mode: 'none',
	target: 'node',
	entry: {
		extension: './src/extension.ts'
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	node: {
		__dirname: false,
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
		vscode: "commonjs vscode"
	},
	output: {
		filename: 'extension.js',
		path: path.resolve(__dirname, '../dist/ext'),
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: "../../[resource-path]"
	},
	devtool: 'source-map'
}
