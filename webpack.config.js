const path = require('path');

module.exports = {
  mode: 'development', // Or 'production'
  entry: './src/content.js',
  output: {
    filename: 'content.js',
    path: path.resolve(__dirname, 'scripts'),
    clean: true,
    publicPath: '' 
  },
  /*
  Content Security Policy (CSP) is blocking the use of eval and similar functions. This often happens when using libraries bundled by Webpack that might internally use eval. Let's fix this by configuring Webpack to avoid using eval
  */
  devtool: 'cheap-module-source-map', // Use a safer source map (to avoid the console error "eval")
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
