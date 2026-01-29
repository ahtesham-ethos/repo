const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.ts',
    content: './src/content.ts',
    background: './src/background.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    fallback: {
      // Chart.js compatibility for browser extension environment
      'canvas': false,
      // jsPDF compatibility for browser extension
      'crypto': false,
      'stream': false,
      'util': false,
      'buffer': false,
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/extension'),
    clean: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/popup.css', to: 'popup.css' },
        { from: 'src/assets', to: 'assets' }
      ],
    }),
  ],
};