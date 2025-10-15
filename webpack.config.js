const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true,
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'postcss-loader',
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public/BRNNO_logov3.jpg', to: 'BRNNO_logov3.jpg' },
                { from: 'public/app.html', to: 'app.html' },
                { from: 'public/landing.html', to: 'landing.html' }
            ]
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        compress: true,
        port: 3001,
        hot: true,
        open: true,
        historyApiFallback: {
            rewrites: [
                { from: /^\/app/, to: '/app.html' }
            ]
        }
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
};
