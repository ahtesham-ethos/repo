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
    fallback: {
      // Chart.js compatibility for standalone script
      'canvas': false,
      // jsPDF compatibility for standalone script
      'crypto': false,
      'stream': false,
      'util': false,
      'buffer': false,
    },
  },
  output: {
    filename: 'blackbox.js',
    path: path.resolve(__dirname, 'dist/script'),
    library: 'Blackbox',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true,
  },
};