var fs = require('fs');
var yaml = require('js-yaml');

function getOptions(configPath) {

	if (params.configPath) {
		return getConfig(path.resolve(params.configPath));
	}

	// Places the config file could be, from highest priority to lowest
	var filenames = [
		'.lightshow',
		'.stylemark'
	]

	var extensions = [
		'.json',
		'.yaml',
		'.yml'
	]

	for (let f = 0; f < filenames.length; f++) {
		for (let e = 0; e < extensions.length; e++) {
			var configFilePath = path.resolve(filenames[f] + extensions[e]);

			var options = getConfig(configFilePath);

			if (options) {
				console.log('Found config file: ' + configFilePath);
				return options;
			}
		}
	}

	// No options file found :(
	console.error('Missing configuration file');
	process.exit(1);
}


function getConfig(filepath) {
	if (!fs.existsSync(filepath)) {
		return false;
	}

	var contents = fs.readFileSync(filepath, 'utf8');

	if (filepath.split('.').pop() === 'yml' || filepath.split('.').pop() === 'yaml') {
		return yaml.safeLoad(contents);
	}

	if (filepath.split('.').pop() === 'json') {
		return JSON.parse(contents);
	}

  // The file path isn't yaml or json uhhh
	return false;
}

module.exports = getOptions;
