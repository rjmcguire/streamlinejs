"use strict";

// This script rebuilds the browser files
// It is run before publishing to NPM.
var fs = require("fs");
var fsp = require("path");
var browserify = require("browserify");
var babelify = require("babelify");
var streamlinePlugin = require('babel-plugin-streamline');

function mkdirs(path) {
	if (fs.existsSync(path)) return;
	mkdirs(fsp.join(path, '..'));
	fs.mkdirSync(path);
}

function noParseList() {
	var list = [];
	function scan(dir) {
		fs.readdirSync(dir).forEach(function(name) {
			var sub = fsp.join(dir, name);
			if (name === 'babylon') list.push(fsp.join(sub, 'index.js'));
			else if (fs.lstatSync(sub).isDirectory()) scan(sub);
		});
	}
	scan(__dirname);
	return list;
}

function build(from, to, opts) {
	var src = fsp.join(__dirname, from);
	var dst = fsp.join(__dirname, to);
	console.log("building " + dst);
	mkdirs(fsp.dirname(dst));
	browserify(src, {
		//debug: true,
		extensions: ['.js', '._js'],
		noParse: noParseList(),
	}).transform(babelify.configure(opts)).bundle().on("error", function(err) {
		console.log("Error : " + err.message);
	}).pipe(fs.createWriteStream(dst)).on('finish', function(){
		finish(dst);
	});
}

// temporary hack to eliminate regexp error in babel source
function finish(dst) {
	if (!/transform\.js$/.test(dst)) return;
	fs.writeFileSync(dst, fs.readFileSync(dst, 'utf8')
		.replace(/(nonASCIIidentifier(?:Start)?Chars) = .*/g, "$1 = '';"), 'utf8');
}

var streamlineOpts = {
	presets: ['es2015'],
	plugins: [[streamlinePlugin, {
		runtime: 'callbacks',
	}]],
	extensions: [".js", "._js"],
};

build("src/browser/callbacks/runtime.js", "lib/browser/callbacks/runtime.js");
build("src/browser/generators/runtime.js", "lib/browser/generators/runtime.js");
build("src/browser/transform.js", "lib/browser/transform.js");
build("test/common/eval-test._js", "test/browser/eval-test.js", streamlineOpts);
build("test/common/flows-test._js", "test/browser/flows-test.js", streamlineOpts);
build("test/common/stack-test._js", "test/browser/stack-test.js", streamlineOpts);
