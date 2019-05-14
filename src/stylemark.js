var path = require('path');
var Parser = require('./parser');
var generator = require('./generator');
var getConfig = require('./getConfig');

var extensions = [].concat(
	require('common-js-file-extensions'), // JS
	['md'],                               // Docs
	['css', 'less', 'scss', 'sass']       // CSS
);

var defaultMatchExtensions = new RegExp(`\\.(${extensions.join('|')})$`);
var defaultExcludeDirectories = ['.git', 'node_modules'];

function generate(params) {
	var input = path.resolve(params.input);
	var output = path.resolve(params.output);
	var options = getConfig(input, params.configPath);

	if (!options) {
		console.error('Missing configuration file');
		process.exit(1);
	}

	options.input = input;
	options.output = output;
	options.match = options.match || defaultMatchExtensions;
	options.excludeDir = defaultExcludeDirectories.concat(options.excludeDir);

	['match', 'excludeDir'].forEach(name => {
		options[name] = typeof options[name] == 'string' ? new RegExp(options[name]) : options[name];
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
