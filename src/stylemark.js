var path = require('path');
var Parser = require('./parser');
var generator = require('./generator');
var getConfig = require('./getConfig');
var _ = require('lodash');
var findRoot = require('find-root');

var jsExtensions = require('common-js-file-extensions');
var markdownExtensions = require('markdown-extensions');
var cssExtensions = ['css', 'less', 'scss', 'sass'];
var defaultMatchExtensions = _(jsExtensions.code)
	.concat(markdownExtensions)
	.concat(cssExtensions)
	.thru(exts => new RegExp('\\.(' + exts.join('|') + ')$'))
	.value();

var defaultExcludeDirectories = ['.git', 'node_modules'];

function generate(params) {
	var input = path.resolve(params.input);
	var output = path.resolve(params.output);
	var options = getOptions(params.configPath);

	if (!options) {
		console.error('Missing configuration file');
		process.exit(1);
	}

	options.input = input;
	options.output = output;
	options.match = options.match || defaultMatchExtensions;
	options.excludeDir = defaultExcludeDirectories.concat(options.excludeDir);
	options.baseDir = options.baseDir ? path.resolve(options.baseDir) : findRoot(configPath);

	['match', 'excludeDir'].forEach(name => {
		options[name] = _.isString(options[name]) ? new RegExp(options[name]) : options[name];
	});

	var parser = new Parser(options);

	parser.parseDir(input, (error, docs) => {
		if (error) {
			console.error(error, error.stack);
			return;
		}
		generator.generate(docs, output, options);
	});
}

module.exports = generate;
