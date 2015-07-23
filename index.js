'use strict';

var gulp = require('gulp')
var path = require('path')
var uglify = require('gulp-uglifyjs')
var concat = require('gulp-concat')
var clean = require('gulp-clean')
var hash = require('gulp-hash')
var merge2 = require('merge2')
var gulpFilter = require('gulp-filter')
var cssmin = require('gulp-cssmin')
var rename = require('gulp-rename')
var save = require('./tasks/save')
var webpack = require('webpack')
var path = require('path')
var gulpWebPack = require('gulp-webpack')
var ExtractTextPlugin = require("extract-text-webpack-plugin")
var ComponentPlugin = require('./plugins/component')
var HASH_LENGTH = 6

function componentsBuild(options) {
    var HASH_LENGTH = options.hashLength
    var entry = options.entry || './index.js'

    return gulpWebPack({
            entry: entry,
            output: {
                filename: 'components.js'
            },
            module: {
                preLoaders: [{
                    test: /[\/\\]c[\/\\][^\/\\]+[\/\\][^\/\\]+\.js/,
                    loader: 'component'
                }],
                loaders:[{
                    test: /.*?\.tpl$/,
                    loader: 'html-loader'
                }, {
                    test: /\.css$/,
                    loader: ExtractTextPlugin.extract("css-loader")
                }, {
                    test: /\.(png|jpg|gif|jpeg|webp)$/,
                    loader: "file-loader?name=[path][name]_[hash:" + HASH_LENGTH + "].[ext]"
                }]
            },
            resolveLoader: {
                modulesDirectories: [path.join(__dirname, './loaders'), path.join(__dirname, './node_modules')]
            },
            plugins: [
                new ComponentPlugin(),
                new webpack.NormalModuleReplacementPlugin(/^[\/\\]c[\/\\][^\/\\]+$/, function(f) {
                    var cname = f.request.match(/[\/\\]c[\/\\]([\w\-\$]+)$/)[1]
                    f.request = cname + '/' + cname
                    return f
                }),
                new ExtractTextPlugin('bundle_[hash:' + HASH_LENGTH +  '].css')
            ],
            resolve: {
                modulesDirectories: ['c']
            }
        })
}


var builder = function(options) {

    var onlyCss
    var cssFilter = gulpFilter(['*.js', '!*.css'])
    var jsFilter = gulpFilter(['**/*', '!*.js'])

    var entry = options.entry || './index.js'
    var libs = options.libs || ['./lib/*.js']

    var streams = []
	/**
     * using webpack build component modules
     */
    streams.push(
        componentsBuild({
            hashLength: HASH_LENGTH,
            entry: entry
        })
        .pipe(jsFilter)
        .pipe(save('components:css,images'))
        .pipe(gulpFilter(['*.css']))
        .pipe(cssmin())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(save('components:css.min'))
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
    )

	/**
     * concat component js bundle with lib js
     */
    streams.push(
        gulp.src(libs)
    )

    return merge2.apply(null, streams)
        .pipe(concat('bundle.js'))
        .pipe(hash({
            hashLength: HASH_LENGTH,
            template: '<%= name %>_<%= hash %><%= ext %>'
        }))
        .pipe(save('bundle:js'))
        .pipe(uglify('bundle.min.js', {
            mangle: true,
            compress: true
        }))
        .pipe(hash({
            hashLength: HASH_LENGTH,
            template: '<%= name %>_<%= hash %><%= ext %>'
        }))
        .pipe(save.restore('components:css,images'))
        .pipe(save.restore('components:css.min'))
        .pipe(save.restore('bundle:js'))
}

builder.clean = clean
builder.concat = concat
builder.uglify = uglify
builder.cssmin = cssmin
builder.rename = rename
builder.merge = merge2
builder.hash = hash

module.exports = builder
