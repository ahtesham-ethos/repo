const path = require('path');

module.exports = {
  entry: './src/standalone.ts',
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
  },
  output: {
    filename: 'page-health-analyzer.js',
    path: path.resolve(__dirname, 'dist/script'),
    library: 'PageHealthAnalyzer',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true,
  },
};