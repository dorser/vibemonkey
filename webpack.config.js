const path = require('path');

module.exports = {
    entry: {
        sidepanel: './src/sidepanel.js',
        options: './src/options.js',
        popup: './src/popup.js',
        'content-script': './src/content-script.js',
        background: './src/background.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
    },
    // ...existing code...
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
};
