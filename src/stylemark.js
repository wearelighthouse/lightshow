var path = require('path');
var Parser = require('./parser');
var generator = require('./generator');
var getConfig = require('./getConfig');
var pickCssFile = require('./pickCssFile');

var jsExtensions = require('common-js-file-extensions').code;
var mdExtensions = ['md'];
var cssExtensions = ['css', 'less', 'scss', 'sass'];

var extensions = [].concat(
	jsExtensions,
	mdExtensions,
	cssExtensions
);

var defaultMatchExtensions = new RegExp(`\\.(${extensions.join('|')})$`);
var defaultExcludeDirectories = ['.git', 'node_modules'];
var defaultNamesFilter = (name) => {
	return name
	  .replace(/[_-]/g, ' ')
		.split(' ')
		.map(w =>  w.substring(0,1).toUpperCase()+ w.substring(1))
		.join(' ');
}

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
	options.cssFilename = pickCssFile(options.theme.css);
	options.namesFilter = eval(options.namesFilter) || defaultNamesFilter;

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
